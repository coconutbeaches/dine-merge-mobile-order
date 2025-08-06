import { supabase } from '@/integrations/supabase/client';

interface DisconnectionEvent {
  clientId?: string;
  reason?: string;
  userAgent?: string;
  timestamp: Date;
}

class RealtimeMonitoring {
  private disconnectionCount = 0;
  private lastDisconnectTime: Date | null = null;
  private clientId: string;
  private isMonitoringEnabled = true;

  constructor() {
    this.clientId = this.generateClientId();
    this.initializeMonitoring();
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMonitoring() {
    if (typeof window === 'undefined') return; // Skip on server side

    // Monitor realtime connection status
    supabase.realtime.on('open', () => {
      console.log('[RealtimeMonitoring] Connection opened');
      this.resetDisconnectionCount();
    });

    supabase.realtime.on('close', (event) => {
      console.log('[RealtimeMonitoring] Connection closed:', event);
      this.handleDisconnection({
        clientId: this.clientId,
        reason: event?.reason || 'Connection closed',
        userAgent: navigator?.userAgent,
        timestamp: new Date()
      });
    });

    supabase.realtime.on('error', (error) => {
      console.error('[RealtimeMonitoring] Connection error:', error);
      this.handleDisconnection({
        clientId: this.clientId,
        reason: `Connection error: ${error?.message || 'Unknown error'}`,
        userAgent: navigator?.userAgent,
        timestamp: new Date()
      });
    });

    // Monitor page visibility to detect potential connection issues
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, check connection status
        this.checkConnectionHealth();
      }
    });

    // Periodic health check (every 30 seconds)
    setInterval(() => {
      this.checkConnectionHealth();
    }, 30000);
  }

  private async handleDisconnection(event: DisconnectionEvent) {
    if (!this.isMonitoringEnabled) return;

    this.disconnectionCount++;
    this.lastDisconnectTime = event.timestamp;

    console.log(`[RealtimeMonitoring] Disconnect #${this.disconnectionCount} logged:`, event);

    try {
      // Log the disconnection to Supabase
      const { data, error } = await supabase.rpc('log_realtime_disconnect', {
        p_client_id: event.clientId,
        p_disconnect_reason: event.reason,
        p_user_agent: event.userAgent,
        p_ip_address: null // Will be populated server-side if needed
      });

      if (error) {
        console.error('[RealtimeMonitoring] Failed to log disconnection:', error);
      } else {
        console.log('[RealtimeMonitoring] Disconnection logged successfully');
      }
    } catch (err) {
      console.error('[RealtimeMonitoring] Error logging disconnection:', err);
    }
  }

  private async checkConnectionHealth() {
    if (!this.isMonitoringEnabled) return;

    try {
      // Simple health check by querying a lightweight function
      const { data, error } = await supabase.rpc('get_recent_disconnect_count', { time_window_minutes: 1 });
      
      if (error) {
        console.warn('[RealtimeMonitoring] Health check failed:', error);
        // Don't count this as a disconnection unless it's a connection issue
        if (error.message?.includes('connection') || error.message?.includes('network')) {
          this.handleDisconnection({
            clientId: this.clientId,
            reason: `Health check failed: ${error.message}`,
            userAgent: navigator?.userAgent,
            timestamp: new Date()
          });
        }
      } else {
        console.log(`[RealtimeMonitoring] Health check OK. Recent disconnects: ${data}`);
      }
    } catch (err) {
      console.warn('[RealtimeMonitoring] Health check error:', err);
    }
  }

  private resetDisconnectionCount() {
    this.disconnectionCount = 0;
    this.lastDisconnectTime = null;
  }

  public getDisconnectionStats() {
    return {
      count: this.disconnectionCount,
      lastDisconnectTime: this.lastDisconnectTime,
      clientId: this.clientId
    };
  }

  public async getRecentDisconnectCount(timeWindowMinutes = 5): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_recent_disconnect_count', {
        time_window_minutes: timeWindowMinutes
      });
      
      if (error) throw error;
      return data || 0;
    } catch (err) {
      console.error('[RealtimeMonitoring] Failed to get recent disconnect count:', err);
      return 0;
    }
  }

  public async getMonitoringAlerts(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('monitoring_alerts')
        .select('*')
        .eq('alert_type', 'realtime_disconnect_threshold')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[RealtimeMonitoring] Failed to get monitoring alerts:', err);
      return [];
    }
  }

  public enableMonitoring() {
    this.isMonitoringEnabled = true;
  }

  public disableMonitoring() {
    this.isMonitoringEnabled = false;
  }
}

// Create singleton instance
export const realtimeMonitoring = new RealtimeMonitoring();

// Export class for testing purposes
export { RealtimeMonitoring };
