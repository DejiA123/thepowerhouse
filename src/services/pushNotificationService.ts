import { supabase } from "@/integrations/supabase/client";
import { sendPush } from "@/lib/push";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  group_chat_notifications: boolean;
  sound_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatNotification {
  id: string;
  user_id: string;
  group_name: string;
  message_id: string;
  sender_name: string;
  message_preview: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Notification preferences + the in-app notification feed.
 *
 * Delivery to other people's devices happens on the server (`send-push` edge
 * function → Web Push), so it works when their app is closed. This service only
 * asks the server to deliver; it never shows OS notifications on the sender's
 * own device.
 */
class PushNotificationService {
  /** Permission is requested from an explicit tap (see EnableNotificationsCard). */
  isEnabled(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching notification preferences:', error);
        return null;
      }
      if (data) return data as NotificationPreferences;

      const { data: created, error: createError } = await supabase
        .from('notification_preferences')
        .insert({ user_id: userId, group_chat_notifications: true, sound_enabled: true })
        .select()
        .single();
      if (createError) {
        console.error('Error creating notification preferences:', createError);
        return null;
      }
      return created as NotificationPreferences;
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return null;
    }
  }

  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, ...preferences, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
    return true;
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
    return true;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    return !error;
  }

  async getUnreadNotifications(userId: string): Promise<ChatNotification[]> {
    const { data, error } = await supabase
      .from('chat_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching unread notifications:', error);
      return [];
    }
    return (data || []) as ChatNotification[];
  }

  /**
   * Notify the other members of a chat about a new message.
   * Signature kept for existing callers; the server looks up everything else.
   */
  async notifyGroupMembers(
    _chatId: string,
    _groupName: string,
    _senderId: string,
    _senderName: string,
    _messagePreview: string,
    messageId: string
  ): Promise<void> {
    sendPush({ type: 'chat-message', messageId });
  }

  /** Show an in-app banner on this device (used for local reminders). */
  showInApp(title: string, message: string, groupName?: string) {
    window.dispatchEvent(new CustomEvent('showInAppNotification', { detail: { title, message, groupName } }));
  }
}

export const pushNotificationService = new PushNotificationService();
