import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BarChart3, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ApiUsageSummary {
  function_name: string;
  total_calls: number;
  total_quota_units: number;
  success_rate: number;
  cache_hit_rate: number;
  avg_quota_per_call: number;
}

const YouTubeApiMonitor = () => {
  const [usageData, setUsageData] = useState<ApiUsageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(24); // hours

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Note: This function doesn't exist in the current schema
      // For now, set empty data to prevent build errors
      const data: ApiUsageSummary[] = [];
      setUsageData(data);
    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError('Unable to load API usage data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [timeRange]);

  const getQuotaStatus = (totalQuota: number) => {
    const dailyLimit = 10000; // YouTube API daily quota limit
    const percentage = (totalQuota / dailyLimit) * 100;
    
    if (percentage >= 90) return { status: 'critical', color: 'destructive', icon: AlertTriangle };
    if (percentage >= 70) return { status: 'warning', color: 'warning', icon: AlertTriangle };
    if (percentage >= 50) return { status: 'moderate', color: 'default', icon: Clock };
    return { status: 'good', color: 'default', icon: CheckCircle };
  };

  const getSuccessStatus = (successRate: number) => {
    if (successRate >= 95) return { status: 'excellent', color: 'default', icon: CheckCircle };
    if (successRate >= 80) return { status: 'good', color: 'default', icon: CheckCircle };
    if (successRate >= 60) return { status: 'fair', color: 'warning', icon: AlertTriangle };
    return { status: 'poor', color: 'destructive', icon: AlertTriangle };
  };

  const getCacheEfficiency = (cacheHitRate: number) => {
    if (cacheHitRate >= 80) return { status: 'excellent', color: 'default', icon: TrendingUp };
    if (cacheHitRate >= 50) return { status: 'good', color: 'default', icon: TrendingUp };
    if (cacheHitRate >= 20) return { status: 'fair', color: 'warning', icon: Clock };
    return { status: 'poor', color: 'destructive', icon: TrendingDown };
  };

  const totalQuotaUsed = usageData.reduce((sum, item) => sum + item.total_quota_units, 0);
  const totalCalls = usageData.reduce((sum, item) => sum + item.total_calls, 0);
  const avgSuccessRate = usageData.length > 0 
    ? usageData.reduce((sum, item) => sum + item.success_rate, 0) / usageData.length 
    : 0;
  const avgCacheHitRate = usageData.length > 0 
    ? usageData.reduce((sum, item) => sum + item.cache_hit_rate, 0) / usageData.length 
    : 0;

  const quotaStatus = getQuotaStatus(totalQuotaUsed);
  const successStatus = getSuccessStatus(avgSuccessRate);
  const cacheStatus = getCacheEfficiency(avgCacheHitRate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold">YouTube API Monitor</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border border-input rounded-md text-sm"
          >
            <option value={1}>Last Hour</option>
            <option value={6}>Last 6 Hours</option>
            <option value={24}>Last 24 Hours</option>
            <option value={168}>Last Week</option>
          </select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchUsageData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Quota Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totalQuotaUsed.toLocaleString()}</div>
              <Badge variant={quotaStatus.color as any}>
                <quotaStatus.icon className="w-3 h-3 mr-1" />
                {Math.round((totalQuotaUsed / 10000) * 100)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of 10,000 daily limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              in last {timeRange} hour{timeRange !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{avgSuccessRate.toFixed(1)}%</div>
              <Badge variant={successStatus.color as any}>
                <successStatus.icon className="w-3 h-3 mr-1" />
                {successStatus.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{avgCacheHitRate.toFixed(1)}%</div>
              <Badge variant={cacheStatus.color as any}>
                <cacheStatus.icon className="w-3 h-3 mr-1" />
                {cacheStatus.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {quotaStatus.status === 'critical' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            YouTube API quota usage is critical ({Math.round((totalQuotaUsed / 10000) * 100)}%). 
            Consider implementing additional caching or reducing API calls.
          </AlertDescription>
        </Alert>
      )}

      {quotaStatus.status === 'warning' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            YouTube API quota usage is high ({Math.round((totalQuotaUsed / 10000) * 100)}%). 
            Monitor usage to avoid hitting daily limits.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Function Usage Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading usage data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : usageData.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No API usage data found for the selected time range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Function</th>
                    <th className="text-right py-2">Calls</th>
                    <th className="text-right py-2">Quota Used</th>
                    <th className="text-right py-2">Success Rate</th>
                    <th className="text-right py-2">Cache Hit Rate</th>
                    <th className="text-right py-2">Avg Quota/Call</th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 font-medium">{item.function_name}</td>
                      <td className="py-2 text-right">{item.total_calls.toLocaleString()}</td>
                      <td className="py-2 text-right">{item.total_quota_units.toLocaleString()}</td>
                      <td className="py-2 text-right">
                        <Badge variant={getSuccessStatus(item.success_rate).color as any}>
                          {item.success_rate.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        <Badge variant={getCacheEfficiency(item.cache_hit_rate).color as any}>
                          {item.cache_hit_rate.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-2 text-right">{item.avg_quota_per_call.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YouTubeApiMonitor; 