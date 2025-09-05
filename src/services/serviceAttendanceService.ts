import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type ServiceAttendance = Tables<"service_attendance">;

class ServiceAttendanceService {
  /**
   * Get attendance count for a specific service
   */
  async getAttendanceCount(serviceDate: string, serviceTime: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_service_attendance_count', {
        service_date_param: serviceDate,
        service_time_param: serviceTime
      });

      if (error) {
        console.error('Error getting attendance count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in getAttendanceCount:', error);
      return 0;
    }
  }

  /**
   * Check if a user is attending a specific service
   */
  async isUserAttending(userId: string, serviceDate: string, serviceTime: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_user_attending_service', {
        user_id_param: userId,
        service_date_param: serviceDate,
        service_time_param: serviceTime
      });

      if (error) {
        console.error('Error checking user attendance:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error in isUserAttending:', error);
      return false;
    }
  }

  /**
   * Set user attendance for a service
   */
  async setAttendance(userId: string, serviceDate: string, serviceTime: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('service_attendance')
        .insert({
          user_id: userId,
          service_date: serviceDate,
          service_time: serviceTime
        });

      if (error) {
        console.error('Error setting attendance:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in setAttendance:', error);
      return false;
    }
  }

  /**
   * Remove user attendance for a service
   */
  async removeAttendance(userId: string, serviceDate: string, serviceTime: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('service_attendance')
        .delete()
        .eq('user_id', userId)
        .eq('service_date', serviceDate)
        .eq('service_time', serviceTime);

      if (error) {
        console.error('Error removing attendance:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeAttendance:', error);
      return false;
    }
  }

  /**
   * Subscribe to attendance changes for real-time updates
   */
  subscribeToAttendanceChanges(serviceDate: string, serviceTime: string, callback: (count: number) => void) {
    const channel = supabase
      .channel(`service_attendance_${serviceDate}_${serviceTime}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_attendance',
          filter: `service_date=eq.${serviceDate} AND service_time=eq.${serviceTime}`
        },
        async () => {
          // Refresh the count when attendance changes
          const count = await this.getAttendanceCount(serviceDate, serviceTime);
          callback(count);
        }
      )
      .subscribe();

    return channel;
  }
}

// Export singleton instance
export const serviceAttendanceService = new ServiceAttendanceService(); 