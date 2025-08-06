"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { realtimeMonitoring } from '@/services/realtimeMonitoring';
import { Badge } from '@/components/ui/badge';

interface MonitoringAlert {
  id: number;
  alert_type: string;
  alert_message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata: any;
  resolved: boolean;
  created_at: string;
  resolved_at?: string;
}

export default function MonitoringPage() {
  const [stats, setStats] = useState({ count: 0, lastDisconnectTime: null, clientId: '' });
  const [recentDisconnects, setRecentDisconnects] = useState(0);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Get local client stats
      const clientStats = realtimeMonitoring.getDisconnectionStats();
      setStats(clientStats);

      // Get recent disconnect count from database
      const recentCount = await realtimeMonitoring.getRecentDisconnectCount(5);
      setRecentDisconnects(recentCount);

      // Get monitoring alerts
      const alertsData = await realtimeMonitoring.getMonitoringAlerts(20);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to refresh monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    if (recentDisconnects > 5) {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    } else if (recentDisconnects > 2) {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    } else {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getStatusText = () => {
    if (recentDisconnects > 5) {
      return 'Alert: High disconnect rate';
    } else if (recentDisconnects > 2) {
      return 'Warning: Elevated disconnects';
    } else {
      return 'Healthy: Connection stable';
    }
  };

  return (
    <Layout title="Realtime Monitoring" showBackButton={true}>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Realtime Connection Monitoring</h1>
          <Button onClick={refreshData} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Status Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
              {getStatusIcon()}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getStatusText()}</div>
              <p className="text-xs text-muted-foreground">Overall system health</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Recent Disconnects</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentDisconnects}</div>
              <p className="text-xs text-muted-foreground">Last 5 minutes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Client Disconnects</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.count}</div>
              <p className="text-xs text-muted-foreground">This session</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {alerts.filter(a => !a.resolved).length}
              </div>
              <p className="text-xs text-muted-foreground">Unresolved alerts</p>
            </CardContent>
          </Card>
        </div>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Client ID:</span>
              <span className="font-mono text-sm">{stats.clientId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Disconnect:</span>
              <span className="text-sm">
                {stats.lastDisconnectTime 
                  ? new Date(stats.lastDisconnectTime).toLocaleString()
                  : 'None recorded'
                }
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Monitoring Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                No alerts recorded
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">{alert.alert_type}</span>
                        {alert.resolved && (
                          <Badge variant="outline" className="text-green-600">
                            RESOLVED
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {alert.alert_message}
                    </div>
                    {alert.metadata && (
                      <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                        <pre>{JSON.stringify(alert.metadata, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Threshold Information */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Disconnect Threshold:</span>
                <span className="text-sm font-medium">5 disconnects in 5 minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Health Check Interval:</span>
                <span className="text-sm font-medium">30 seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Alert Severity:</span>
                <span className="text-sm font-medium">High</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
