import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { pushNotificationService, ChatNotification } from '@/services/pushNotificationService';

interface NotificationContextType {
  unreadCount: number;
  notifications: ChatNotification[];
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  showInAppNotification: (title: string, message: string, groupName?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [inAppNotifications, setInAppNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    groupName?: string;
    timestamp: number;
  }>>([]);
  const { user } = useAuth();

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (user) {
      refreshNotifications();
      
      // Initialize notification permissions
      const initializeNotifications = async () => {
        try {
          console.log('🔔 Initializing notification system...');
          const granted = await pushNotificationService.requestPermission();
          console.log('🔔 Notification permission result:', granted);
        } catch (error) {
          console.error('❌ Error initializing notifications:', error);
        }
      };
      
      initializeNotifications();
      
      // Set up interval to check for new notifications every 30 seconds
      const interval = setInterval(refreshNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Listen for in-app notification events
  useEffect(() => {
    const handleInAppNotification = (event: CustomEvent) => {
      console.log('📱 Received in-app notification event:', event.detail);
      const { title, message, groupName } = event.detail;
      showInAppNotification(title, message, groupName);
    };

    window.addEventListener('showInAppNotification', handleInAppNotification as EventListener);
    
    return () => {
      window.removeEventListener('showInAppNotification', handleInAppNotification as EventListener);
    };
  }, []);

  const refreshNotifications = async () => {
    if (!user) return;
    
    try {
      const unreadNotifications = await pushNotificationService.getUnreadNotifications(user.id);
      setNotifications(unreadNotifications);
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await pushNotificationService.markAsRead(notificationId);
      await refreshNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Mark all unread notifications as read
      const promises = notifications.map(notification => 
        pushNotificationService.markAsRead(notification.id)
      );
      await Promise.all(promises);
      await refreshNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const showInAppNotification = (title: string, message: string, groupName?: string) => {
    const notificationId = `in-app-${Date.now()}-${Math.random()}`;
    const newNotification = {
      id: notificationId,
      title,
      message,
      groupName,
      timestamp: Date.now()
    };

    setInAppNotifications(prev => [...prev, newNotification]);
    // Removed auto-close - notifications will stay until manually closed
  };

  const value: NotificationContextType = {
    unreadCount,
    notifications,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    showInAppNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* In-App Notification Display */}
      <InAppNotificationDisplay 
        notifications={inAppNotifications} 
        onDismiss={(notificationId) => {
          setInAppNotifications(prev => prev.filter(n => n.id !== notificationId));
        }}
      />
    </NotificationContext.Provider>
  );
};

// In-App Notification Display Component
interface InAppNotificationDisplayProps {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    groupName?: string;
    timestamp: number;
  }>;
  onDismiss: (notificationId: string) => void;
}

const InAppNotificationDisplay: React.FC<InAppNotificationDisplayProps> = ({ notifications, onDismiss }) => {
  const [swipeState, setSwipeState] = React.useState<{[key: string]: {startX: number, startY: number, currentX: number, currentY: number, isDragging: boolean}}>({});

  const handleTouchStart = (e: React.TouchEvent, notificationId: string) => {
    const touch = e.touches[0];
    setSwipeState(prev => ({
      ...prev,
      [notificationId]: {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        isDragging: true
      }
    }));
  };

  const handleTouchMove = (e: React.TouchEvent, notificationId: string) => {
    const state = swipeState[notificationId];
    if (!state?.isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;
    
    // If swipe gesture is detected (either horizontal or vertical), prevent default scrolling
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      e.preventDefault();
    }
    
    setSwipeState(prev => ({
      ...prev,
      [notificationId]: {
        ...state,
        currentX: touch.clientX,
        currentY: touch.clientY
      }
    }));
  };

  const handleTouchEnd = (notificationId: string) => {
    const state = swipeState[notificationId];
    if (!state?.isDragging) return;
    
    const deltaX = state.currentX - state.startX;
    const deltaY = state.currentY - state.startY;
    
    // Dismiss if swiped right (>70px) or up (>50px) 
    const shouldDismiss = deltaX > 70 || deltaY < -50;
    
    if (shouldDismiss) {
      onDismiss(notificationId);
    }
    
    // Reset swipe state
    setSwipeState(prev => {
      const newState = { ...prev };
      delete newState[notificationId];
      return newState;
    });
  };

  const getTransformStyle = (notificationId: string) => {
    const state = swipeState[notificationId];
    if (!state?.isDragging) return {};
    
    const deltaX = state.currentX - state.startX;
    const deltaY = state.currentY - state.startY;
    
    // Handle right swipe
    if (deltaX > 0 && Math.abs(deltaX) > Math.abs(deltaY)) {
      const clampedDeltaX = Math.max(0, deltaX);
      const opacity = Math.max(0.4, 1 - (clampedDeltaX / 180));
      const scale = Math.max(0.95, 1 - (clampedDeltaX / 400));
      
      return {
        transform: `translateX(${clampedDeltaX}px) scale(${scale})`,
        opacity: opacity,
        transition: 'none'
      };
    }
    
    // Handle upward swipe with improved visual feedback
    if (deltaY < 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
      const clampedDeltaY = Math.min(0, deltaY);
      const opacity = Math.max(0.3, 1 + (clampedDeltaY / 100));
      const scale = Math.max(0.85, 1 + (clampedDeltaY / 250));
      
      return {
        transform: `translateY(${clampedDeltaY}px) scale(${scale})`,
        opacity: opacity,
        transition: 'none'
      };
    }
    
    return {};
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="group pointer-events-auto relative flex w-full max-w-sm items-center justify-between space-x-4 overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/95 to-indigo-50/95 p-6 pr-8 shadow-xl transition-all backdrop-blur-sm border-l-4 border-l-blue-500 animate-in slide-in-from-right-2 duration-300 cursor-grab active:cursor-grabbing select-none"
          style={{
            ...getTransformStyle(notification.id),
            touchAction: 'pan-y',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
          onTouchStart={(e) => handleTouchStart(e, notification.id)}
          onTouchMove={(e) => handleTouchMove(e, notification.id)}
          onTouchEnd={() => handleTouchEnd(notification.id)}
          onTouchCancel={() => handleTouchEnd(notification.id)}
        >
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold tracking-tight text-blue-900">
                {notification.title}
              </p>
              <p className="text-sm opacity-95 leading-relaxed text-blue-800 mt-1">
                {notification.message}
              </p>
              {notification.groupName && (
                <div className="flex items-center mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                    </svg>
                    {notification.groupName}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              onDismiss(notification.id);
            }}
            className="absolute right-2 top-2 rounded-md p-1 text-blue-400 opacity-0 transition-opacity hover:text-blue-600 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}; 