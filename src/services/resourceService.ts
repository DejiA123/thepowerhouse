import { supabase } from '@/integrations/supabase/client';

export interface ResourceItem {
  name: string;
  description: string;
  downloads: number;
}

export interface ResourceCategory {
  title: string;
  icon: React.ReactNode;
  items: ResourceItem[];
}

export class ResourceService {
  // Get download count for a specific resource
  static async getDownloadCount(resourceName: string, category: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_resource_download_count', {
        _resource_name: resourceName,
        _resource_category: category
      });

      if (error) {
        console.error('Error fetching download count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error fetching download count:', error);
      return 0;
    }
  }

  // Record a download for a resource
  static async recordDownload(
    resourceName: string, 
    category: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('record_resource_download', {
        _resource_name: resourceName,
        _resource_category: category,
        _ip_address: ipAddress,
        _user_agent: userAgent
      });

      if (error) {
        console.error('Error recording download:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error recording download:', error);
      return false;
    }
  }

  // Get all download counts for resources
  static async getResourceDownloadCounts(): Promise<Record<string, Record<string, number>>> {
    try {
      const { data, error } = await supabase
        .from('resource_downloads')
        .select('resource_name, resource_category');

      if (error) {
        console.error('Error fetching download counts:', error);
        return {};
      }

      // Group by category and resource name
      const counts: Record<string, Record<string, number>> = {};
      
      data?.forEach(download => {
        if (!counts[download.resource_category]) {
          counts[download.resource_category] = {};
        }
        
        if (!counts[download.resource_category][download.resource_name]) {
          counts[download.resource_category][download.resource_name] = 0;
        }
        
        counts[download.resource_category][download.resource_name]++;
      });

      return counts;
    } catch (error) {
      console.error('Error fetching download counts:', error);
      return {};
    }
  }

  // Get client IP address (basic implementation)
  static getClientIP(): string | undefined {
    // This is a basic implementation - in a real app, you'd get this from the server
    // For now, we'll return undefined and let the server handle it
    return undefined;
  }

  // Get user agent
  static getUserAgent(): string | undefined {
    if (typeof window !== 'undefined') {
      return window.navigator.userAgent;
    }
    return undefined;
  }
} 