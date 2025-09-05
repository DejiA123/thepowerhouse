import { supabase } from "@/integrations/supabase/client";

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

class PushNotificationService {
  private isSupported: boolean;
  private permission: NotificationPermission = 'default';
  private processedNotifications = new Set<string>(); // Track processed notifications at service level

  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    this.permission = this.isSupported ? Notification.permission : 'denied';
  }

  /**
   * Check if we're on iOS
   */
  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<boolean> {
    if (this.isIOS()) {
      // On iOS, we can't use browser notifications, but we can show in-app notifications
      console.log('iOS detected - using in-app notifications instead of browser notifications');
      this.permission = 'granted'; // Treat as granted for in-app notifications
      return true;
    }

    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    if (this.isIOS()) {
      // On iOS, always return true for in-app notifications
      return true;
    }
    return this.isSupported && this.permission === 'granted';
  }

  /**
   * Get or create user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      // Try to get existing preferences
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No preferences found, create default ones
        const defaultPreferences = {
          user_id: userId,
          group_chat_notifications: true,
          sound_enabled: true
        };

        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert(defaultPreferences)
          .select()
          .single();

        if (createError) {
          console.error('Error creating notification preferences:', createError);
          return null;
        }

        return newPrefs;
      }

      if (error) {
        console.error('Error fetching notification preferences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return null;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating notification preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updatePreferences:', error);
      return false;
    }
  }

  /**
   * Get group members who should receive notifications
   */
  async getGroupMembersForNotifications(groupName: string, excludeUserId?: string): Promise<string[]> {
    try {
      console.log('🔍 Getting group members for notifications in group:', groupName);
      console.log('🚫 Excluding user:', excludeUserId);
      
      // First, get all group members
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_name', groupName);

      if (membersError) {
        console.error('Error fetching group members:', membersError);
        return [];
      }

      if (!members || members.length === 0) {
        console.log('No members found in group:', groupName);
        return [];
      }

      console.log('Found', members.length, 'members in group:', members.map(m => m.user_id));

      // Get user IDs (excluding sender)
      const userIds = members
        .map(member => member.user_id)
        .filter(userId => userId !== excludeUserId);

      if (userIds.length === 0) {
        console.log('No members to notify (all excluded)');
        return [];
      }

      console.log('Members after excluding sender:', userIds);

      // Check notification preferences for each user
      const { data: preferences, error: prefsError } = await supabase
        .from('notification_preferences')
        .select('user_id, group_chat_notifications')
        .in('user_id', userIds);

      if (prefsError) {
        console.error('Error fetching notification preferences:', prefsError);
        // If we can't get preferences, assume all users want notifications
        return userIds;
      }

      console.log('Found preferences for users:', preferences);

      // Create a map of user preferences
      const prefsMap = new Map();
      preferences?.forEach(pref => {
        prefsMap.set(pref.user_id, pref.group_chat_notifications);
      });

      // Filter users who have notifications enabled
      const usersToNotify = userIds.filter(userId => {
        const hasPrefs = prefsMap.has(userId);
        const notificationsEnabled = prefsMap.get(userId);
        
        console.log(`User ${userId}: hasPrefs=${hasPrefs}, notificationsEnabled=${notificationsEnabled}`);
        
        // If user has no preferences, assume they want notifications (don't try to create them)
        if (!hasPrefs) {
          console.log('User has no preferences, assuming notifications enabled:', userId);
          return true; // Enable by default
        }
        
        return notificationsEnabled;
      });

      console.log('Users to notify:', usersToNotify.length, 'out of', userIds.length);
      console.log('Final users to notify:', usersToNotify);
      return usersToNotify;
    } catch (error) {
      console.error('Error in getGroupMembersForNotifications:', error);
      return [];
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendNotificationToUser(
    userId: string,
    groupName: string,
    senderName: string,
    messagePreview: string,
    messageId: string
  ): Promise<boolean> {
    try {
      console.log('📨 Sending notification to user:', userId, 'for group:', groupName);
      
      // Check if user has notifications enabled
      const preferences = await this.getUserPreferences(userId);
      console.log('📋 User preferences for', userId, ':', preferences);
      
      // If no preferences exist, assume notifications are enabled
      if (!preferences) {
        console.log('📋 No preferences found for user, assuming notifications enabled:', userId);
      } else if (!preferences.group_chat_notifications) {
        console.log('❌ User has notifications disabled:', userId);
        return false;
      }

      console.log('✅ User has notifications enabled:', userId);

      // Store notification in database
      const { error: dbError } = await supabase
        .from('chat_notifications')
        .insert({
          user_id: userId,
          group_name: groupName,
          message_id: messageId,
          sender_name: senderName,
          message_preview: messagePreview,
          is_read: false
        });

      if (dbError) {
        console.error('❌ Error storing notification in database:', dbError);
      } else {
        console.log('✅ Notification stored in database');
      }

      // Always show browser notification if enabled and app is not focused
      if (this.isEnabled() && !document.hasFocus()) {
        console.log('🔔 Showing browser notification (app not focused)');
        this.showBrowserNotification(groupName, senderName, messagePreview);
      }
      
      // Always show in-app notification for current user if app is focused
      const isCurrentUser = userId === (await supabase.auth.getUser()).data.user?.id;
      if (isCurrentUser && document.hasFocus()) {
        console.log('📱 This is the current user, showing in-app notification');
        const event = new CustomEvent('showInAppNotification', {
          detail: {
            title: `New message in ${groupName}`,
            message: `${senderName}: ${messagePreview}`,
            groupName
          }
        });
        window.dispatchEvent(event);
        console.log('✅ In-app notification event dispatched');
      }

      return true;
    } catch (error) {
      console.error('❌ Error sending notification to user:', error);
      return false;
    }
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(groupName: string, senderName: string, messagePreview: string): void {
    console.log('🔔 Attempting to show browser notification...');
    
    if (!this.isEnabled()) {
      console.log('❌ Notifications not enabled');
      return;
    }

    // On iOS, show a fallback notification
    if (this.isIOS()) {
      console.log('📱 iOS detected - showing fallback notification');
      // For iOS, we'll show an in-app notification instead
      const event = new CustomEvent('showInAppNotification', {
        detail: {
          title: `New message in ${groupName}`,
          message: `${senderName}: ${messagePreview}`,
          groupName
        }
      });
      window.dispatchEvent(event);
      return;
    }

    try {
      console.log('🔔 Creating browser notification...');
             const notification = new Notification(`New message in ${groupName}`, {
         body: `${senderName}: ${messagePreview}`,
         icon: '/lovable-uploads/17d2a568-fd22-4680-827b-b659c3433008.png', // Church logo
         badge: '/lovable-uploads/17d2a568-fd22-4680-827b-b659c3433008.png',
         tag: `group-chat-${groupName}`,
         requireInteraction: true, // Require user interaction to dismiss
         silent: false
       });

      console.log('✅ Browser notification created successfully');

      // Handle notification click
      notification.onclick = () => {
        console.log('🖱️ Notification clicked');
        window.focus();
        notification.close();
        // You could add navigation logic here to open the specific group chat
      };

      // Don't auto-close group chat notifications - let user dismiss them manually
      console.log('📱 Group chat notification will remain open until user dismisses it');
    } catch (error) {
      console.error('❌ Error showing browser notification:', error);
      // Fallback to in-app notification
      console.log('🔄 Falling back to in-app notification');
      const event = new CustomEvent('showInAppNotification', {
        detail: {
          title: `New message in ${groupName}`,
          message: `${senderName}: ${messagePreview}`,
          groupName
        }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<ChatNotification[]> {
    try {
      const { data, error } = await supabase
        .from('chat_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching unread notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUnreadNotifications:', error);
      return [];
    }
  }

  /**
   * Send notifications to all group members when a new message is sent
   */
  async notifyGroupMembers(
    groupName: string,
    senderId: string,
    senderName: string,
    messagePreview: string,
    messageId: string
  ): Promise<void> {
    try {
      // Create a unique key for this notification
      const notificationKey = `${messageId}-${groupName}`;
      
      // Check if we've already processed this notification
      if (this.processedNotifications.has(notificationKey)) {
        console.log('⚠️ Notification already processed for message:', messageId);
        return;
      }
      
      // Mark this notification as processed
      this.processedNotifications.add(notificationKey);
      
      // Clean up old notifications (keep only last 100)
      if (this.processedNotifications.size > 100) {
        const entries = Array.from(this.processedNotifications);
        this.processedNotifications.clear();
        entries.slice(-50).forEach(entry => this.processedNotifications.add(entry));
      }
      
      console.log('🚀 Starting notification process for group:', groupName);
      console.log('📤 Sender:', senderName, '(', senderId, ')');
      console.log('💬 Message preview:', messagePreview);
      
      // Get all group members who should receive notifications
      const memberIds = await this.getGroupMembersForNotifications(groupName, senderId);

      if (memberIds.length === 0) {
        console.log('⚠️ No members to notify');
        return;
      }

      console.log('📋 Sending notifications to', memberIds.length, 'members:', memberIds);

      // Send notifications to each member
      const notificationPromises = memberIds.map(userId =>
        this.sendNotificationToUser(userId, groupName, senderName, messagePreview, messageId)
      );

      const results = await Promise.allSettled(notificationPromises);
      
      const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      console.log(`✅ Notification results: ${successful} successful, ${failed} failed`);
      
      if (failed > 0) {
        console.error('❌ Failed notifications:', results.filter(result => result.status === 'rejected'));
      }
    } catch (error) {
      console.error('❌ Error notifying group members:', error);
    }
  }

  /**
   * Force show a notification for testing purposes
   */
  async forceShowNotification(
    title: string,
    message: string,
    groupName?: string
  ): Promise<void> {
    console.log('🧪 Force showing notification for testing...');
    
    // Try browser notification first
    if (this.isEnabled()) {
      try {
                 const notification = new Notification(title, {
           body: message,
           icon: '/lovable-uploads/17d2a568-fd22-4680-827b-b659c3433008.png',
           badge: '/lovable-uploads/17d2a568-fd22-4680-827b-b659c3433008.png',
           tag: `test-${Date.now()}`,
           requireInteraction: true, // Require user interaction to dismiss
           silent: false
         });

        console.log('✅ Force browser notification created');

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

                 // Don't auto-close test notifications - let user dismiss them manually
         console.log('📱 Test notification will remain open until user dismisses it');
      } catch (error) {
        console.error('❌ Force browser notification failed:', error);
      }
    }

    // Also show in-app notification
    const event = new CustomEvent('showInAppNotification', {
      detail: {
        title,
        message,
        groupName
      }
    });
    window.dispatchEvent(event);
    console.log('✅ Force in-app notification dispatched');
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService(); 