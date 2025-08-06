-- Create table to track realtime disconnections
CREATE TABLE IF NOT EXISTS realtime_disconnect_log (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT,
    disconnect_reason TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the monitoring table
ALTER TABLE realtime_disconnect_log ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to insert monitoring data
CREATE POLICY "Service role can manage disconnect logs" ON realtime_disconnect_log
FOR ALL USING (auth.role() = 'service_role');

-- Create function to count disconnections in last 5 minutes
CREATE OR REPLACE FUNCTION get_recent_disconnect_count(time_window_minutes INTEGER DEFAULT 5)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    disconnect_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO disconnect_count
    FROM realtime_disconnect_log
    WHERE created_at >= NOW() - INTERVAL '1 minute' * time_window_minutes;
    
    RETURN disconnect_count;
END;
$$;

-- Create function to log realtime disconnections
CREATE OR REPLACE FUNCTION log_realtime_disconnect(
    p_client_id TEXT DEFAULT NULL,
    p_disconnect_reason TEXT DEFAULT 'Unknown',
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id BIGINT;
BEGIN
    INSERT INTO realtime_disconnect_log (
        client_id,
        disconnect_reason,
        user_agent,
        ip_address
    ) VALUES (
        p_client_id,
        p_disconnect_reason,
        p_user_agent,
        p_ip_address::INET
    ) RETURNING id INTO log_id;
    
    -- Check if we've exceeded the threshold (5 disconnects in 5 minutes)
    IF (SELECT get_recent_disconnect_count(5)) > 5 THEN
        -- Insert into a notifications table that can trigger webhooks/alerts
        INSERT INTO monitoring_alerts (
            alert_type,
            alert_message,
            severity,
            metadata
        ) VALUES (
            'realtime_disconnect_threshold',
            'Realtime disconnect count exceeded 5 in 5 minutes',
            'high',
            json_build_object(
                'disconnect_count', (SELECT get_recent_disconnect_count(5)),
                'time_window', '5 minutes',
                'threshold', 5
            )
        );
    END IF;
    
    RETURN gen_random_uuid();
END;
$$;

-- Create alerts table for monitoring
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_type TEXT NOT NULL,
    alert_message TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Enable RLS on alerts table
ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- Policy for alerts table
CREATE POLICY "Service role can manage alerts" ON monitoring_alerts
FOR ALL USING (auth.role() = 'service_role');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_realtime_disconnect_log_created_at ON realtime_disconnect_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created_at ON monitoring_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_resolved ON monitoring_alerts(resolved);

-- Create webhook function that can be called to send alerts to external systems
CREATE OR REPLACE FUNCTION send_monitoring_alert_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This would typically use pg_net extension to send HTTP requests
    -- For now, we'll log the alert
    RAISE LOG 'MONITORING ALERT: % - % (severity: %)', NEW.alert_type, NEW.alert_message, NEW.severity;
    
    -- You can add webhook logic here using pg_net.http_post
    -- Example:
    -- PERFORM net.http_post(
    --     url := 'https://your-webhook-endpoint.com/alerts',
    --     body := json_build_object(
    --         'alert_type', NEW.alert_type,
    --         'message', NEW.alert_message,
    --         'severity', NEW.severity,
    --         'metadata', NEW.metadata,
    --         'created_at', NEW.created_at
    --     )::TEXT
    -- );
    
    RETURN NEW;
END;
$$;

-- Create trigger to send webhooks when alerts are created
DROP TRIGGER IF EXISTS trigger_send_monitoring_alert ON monitoring_alerts;
CREATE TRIGGER trigger_send_monitoring_alert
    AFTER INSERT ON monitoring_alerts
    FOR EACH ROW
    EXECUTE FUNCTION send_monitoring_alert_webhook();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON realtime_disconnect_log TO anon, authenticated;
GRANT SELECT ON monitoring_alerts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_recent_disconnect_count TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_realtime_disconnect TO anon, authenticated;
