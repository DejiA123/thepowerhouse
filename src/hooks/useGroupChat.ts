import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { pushNotificationService } from "@/services/pushNotificationService";

export interface Message {
  id: string;
  message: string;
  user_id: string;
  group_name: string;
  created_at: string;
  deleted_at: string | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

export const useGroupChat = (groupName: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const channelRef = useRef<any>(null);


    useEffect(() => {
    if (groupName) {
      console.log('Setting up chat for group:', groupName);
      
      // Clean up any existing channel first
      if (channelRef.current) {
        console.log('Cleaning up existing channel before creating new one');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      fetchMessages();
      const channel = subscribeToMessages();
      channelRef.current = channel;
      
      return () => {
        console.log('Cleaning up subscription for group:', groupName);
        if (channelRef.current) {
          console.log('Removing channel:', channelRef.current);
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    }
  }, [groupName]);

  useEffect(() => {
    if (scrollRef.current) {
      // Add a small delay to ensure the DOM is updated
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          console.log('Scrolled to bottom, scrollHeight:', scrollRef.current.scrollHeight);
        }
      }, 150);
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setInitialLoading(true);
      
      console.log('Fetching messages for group:', groupName);
      
      // First try with deleted_at field - fetch messages without profile join
      let { data: messagesData, error: messagesError } = await supabase
        .from('group_messages')
        .select(`
          id,
          message,
          user_id,
          group_name,
          created_at,
          deleted_at
        `)
        .eq('group_name', groupName)
        .is('deleted_at', null) // Only get non-deleted messages
        .order('created_at', { ascending: false })
        .limit(100);

              // If that fails, try without deleted_at field (fallback for old schema)
        if (messagesError && messagesError.message.includes('deleted_at')) {
          console.log('deleted_at column not found, trying without it...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('group_messages')
            .select(`
              id,
              message,
              user_id,
              group_name,
              created_at,
              deleted_at
            `)
            .eq('group_name', groupName)
            .order('created_at', { ascending: false })
            .limit(100);

        if (fallbackError) {
          console.error('Error fetching messages (fallback):', fallbackError);
          toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
          setMessages([]);
          return;
        }

        messagesData = fallbackData;
        messagesError = null;
      }

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
        setMessages([]);
        return;
      }

      console.log('Raw messages data from Supabase:', messagesData);
      
      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      // Get all unique user IDs from messages
      const userIds = [...new Set(messagesData.map((msg: any) => msg.user_id))];
      console.log('Unique user IDs from messages:', userIds);

      // Fetch profiles for all users
      let profilesMap: { [key: string]: any } = {};
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else if (profilesData) {
          // Create a map of profiles by user ID
          profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.id] = {
              full_name: profile.full_name || '',
              email: profile.email || ''
            };
            return acc;
          }, {} as { [key: string]: any });
          console.log('Profiles map created:', Object.keys(profilesMap).length, 'profiles');
        }
      } catch (profileError) {
        console.error('Error in profile fetching:', profileError);
      }

      const messagesWithProfiles: Message[] = messagesData.map((message: any) => {
        console.log('Processing message:', message.id);
        return {
          id: message.id,
          message: message.message,
          user_id: message.user_id,
          group_name: message.group_name,
          created_at: message.created_at,
          deleted_at: message.deleted_at || null, // Handle case where deleted_at doesn't exist
          profiles: profilesMap[message.user_id] || null
        };
      });

      console.log('Final processed messages:', messagesWithProfiles.length, 'messages');
      
      // Reverse the array since we fetched newest first but want to display oldest first
      const reversedMessages = messagesWithProfiles.reverse();
      console.log('Reversed messages for display:', reversedMessages.length, 'messages');
      setMessages(reversedMessages);
    } catch (error) {
      console.error('Error in fetchMessages:', error);
      setMessages([]);
    } finally {
      setInitialLoading(false);
    }
  };

  const subscribeToMessages = () => {
    try {
      console.log('Setting up real-time subscription for group:', groupName);
      
      // Create a more stable channel name with timestamp to avoid conflicts
      const channelName = `group_messages_${groupName}_${Date.now()}`;
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'group_messages',
            filter: `group_name=eq.${groupName}`
          },
          async (payload) => {
            try {
              console.log('🔥 REALTIME: New message received!', payload.new?.id);
              
              if (!payload.new) {
                console.error('No new data in payload');
                return;
              }
              

              
              // Create message directly from payload to avoid RLS issues
              console.log('📨 Creating message from payload:', payload.new.id);
              
              // Fetch profile data for the new message
              let profileData = null;
              try {
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('full_name, email')
                  .eq('id', payload.new.user_id)
                  .single();
                
                if (!profileError && profile) {
                  profileData = {
                    full_name: profile.full_name || '',
                    email: profile.email || ''
                  };
                  console.log('✅ Fetched profile data for user:', payload.new.user_id, profileData);
                } else {
                  console.log('⚠️ Could not fetch profile for user:', payload.new.user_id, profileError);
                }
              } catch (profileError) {
                console.log('⚠️ Error fetching profile:', profileError);
              }
              
              const newMessageWithProfile: Message = {
                id: payload.new.id,
                message: payload.new.message,
                user_id: payload.new.user_id,
                group_name: payload.new.group_name,
                created_at: payload.new.created_at,
                deleted_at: payload.new.deleted_at,
                profiles: profileData
              };

              console.log('✅ Adding new message to state:', newMessageWithProfile.id);
              
              // Add the new message to the state, avoiding duplicates
              setMessages(prevMessages => {
                const messageExists = prevMessages.some(msg => msg.id === newMessageWithProfile.id);
                if (messageExists) {
                  console.log('⚠️ Message already exists, skipping:', newMessageWithProfile.id);
                  return prevMessages;
                }
                console.log('➕ Adding new message to chat');
                return [...prevMessages, newMessageWithProfile];
              });

              // Trigger notifications for received messages (only if not from current user)
              if (user && newMessageWithProfile.user_id !== user.id) {
                console.log('🔔 Triggering notifications for received message from:', newMessageWithProfile.user_id);
                
                const senderName = profileData?.full_name || 
                                 profileData?.email || 
                                 'Unknown User';
                const messagePreview = newMessageWithProfile.message.length > 50 
                  ? newMessageWithProfile.message.substring(0, 50) + '...' 
                  : newMessageWithProfile.message;
                
                // Send notifications asynchronously
                pushNotificationService.notifyGroupMembers(
                  groupName,
                  groupName,
                  newMessageWithProfile.user_id,
                  senderName,
                  messagePreview,
                  newMessageWithProfile.id
                ).then(() => {
                  console.log('✅ Notifications sent for received message');
                }).catch(error => {
                  console.error('❌ Error sending notifications for received message:', error);
                });
              }
            } catch (error) {
              console.error('❌ Error in subscription handler:', error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'group_messages',
            filter: `group_name=eq.${groupName}`
          },
          async (payload) => {
            try {
              console.log('🔄 REALTIME: Message updated!', payload.new?.id);
              
              if (!payload.new) {
                console.error('No updated data in payload');
                return;
              }

              // If message was deleted (deleted_at is set), remove it from the state
              if (payload.new.deleted_at) {
                console.log('🗑️ Message deleted, removing from state:', payload.new.id);
                setMessages(prevMessages => 
                  prevMessages.filter(msg => msg.id !== payload.new.id)
                );
              }
            } catch (error) {
              console.error('❌ Error in update subscription handler:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status changed:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to realtime updates for group:', groupName);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel subscription error for group:', groupName);
            // Don't show error toast, just log it for debugging
          } else if (status === 'CLOSED') {
            console.log('🔒 Channel closed for group:', groupName);
          } else if (status === 'TIMED_OUT') {
            console.warn('⏰ Channel subscription timed out, retrying...');
            // Retry subscription after a short delay
            setTimeout(() => {
              if (channel) {
                supabase.removeChannel(channel);
                subscribeToMessages();
              }
            }, 2000);
          }
        });

      return channel;
    } catch (error) {
      console.error('❌ Error setting up subscription:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || loading) return;

    const messageToSend = newMessage.trim();
    console.log('📤 Sending message:', messageToSend, 'from user:', user.id);
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .insert({
          message: messageToSend,
          user_id: user.id,
          group_name: groupName
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error sending message:', error);
        toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
      } else {
        setNewMessage("");
        console.log('✅ Message sent successfully');
        
        // Removed message sent notification - user can see their message immediately
        
        // Add the message to local state immediately so it appears for the sender
        const newMessageWithProfile: Message = {
          id: data.id,
          message: data.message,
          user_id: data.user_id,
          group_name: data.group_name,
          created_at: data.created_at,
          deleted_at: data.deleted_at,
          profiles: {
            full_name: user.user_metadata?.full_name || '',
            email: user.email || ''
          }
        };
        
        console.log('📝 Adding sent message to local state:', newMessageWithProfile.id);
        setMessages(prevMessages => {
          const messageExists = prevMessages.some(msg => msg.id === newMessageWithProfile.id);
          if (messageExists) {
            console.log('⚠️ Message already exists in state, skipping:', newMessageWithProfile.id);
            return prevMessages;
          }
          console.log('➕ Adding sent message to chat state');
          return [...prevMessages, newMessageWithProfile];
        });
        
        // Trigger notifications for the sent message
        const senderName = user.user_metadata?.full_name || user.email || 'Unknown User';
        const messagePreview = messageToSend.length > 50 
          ? messageToSend.substring(0, 50) + '...' 
          : messageToSend;
        
        console.log('🔔 Triggering notifications for sent message');
        pushNotificationService.notifyGroupMembers(
          groupName,
          groupName,
          user.id,
          senderName,
          messagePreview,
          data.id
        ).then(() => {
          console.log('✅ Notifications sent for sent message');
        }).catch(error => {
          console.error('❌ Error sending notifications for sent message:', error);
        });
      }
    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
    setLoading(false);
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      // Try to soft delete first
      const { error } = await supabase
        .from('group_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', user.id); // Only allow users to delete their own messages

      // If that fails (deleted_at column doesn't exist), try hard delete
      if (error && error.message.includes('deleted_at')) {
        console.log('deleted_at column not found, trying hard delete...');
        const { error: hardDeleteError } = await supabase
          .from('group_messages')
          .delete()
          .eq('id', messageId)
          .eq('user_id', user.id);

        if (hardDeleteError) {
          console.error('❌ Error hard deleting message:', hardDeleteError);
          toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
          return;
        }
      } else if (error) {
        console.error('❌ Error deleting message:', error);
        toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
        return;
      }

      console.log('✅ Message deleted successfully');
      toast({ title: "Success", description: "Message deleted", variant: "success" });
    } catch (error) {
      console.error('❌ Error in deleteMessage:', error);
      toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
    }
  };

  // Fetch group members
  const fetchMembers = async () => {
    try {
      // Use manual join instead of foreign key hint since schema cache isn't recognizing it
      let { data, error } = await supabase
        .from('group_members')
        .select(`
          user_id, 
          joined_at,
          profiles!inner(full_name, email)
        `)
        .eq('group_name', groupName);
      
      if (error) {
        console.warn('Profile join failed, trying manual join:', error.message);
        // Fallback: fetch without join and manually join
        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select('user_id, joined_at')
          .eq('group_name', groupName);
        
        if (membersError) {
          console.error('Error fetching group members:', membersError);
          setMembers([]);
          setMemberCount(0);
          setIsMember(false);
          return;
        }

        // Get all user IDs and fetch profiles separately
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Use fallback data
          data = membersData.map(m => ({ ...m, profiles: null }));
        } else {
          // Create a map of profiles by user ID
          const profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
          
          // Combine members with their profiles
          data = membersData.map(m => ({ 
            ...m, 
            profiles: profilesMap[m.user_id] || null 
          }));
        }
      }
      
      let memberList = data || [];
      const missingIds = memberList.filter((m: any) => !m.profiles).map((m: any) => m.user_id);
      if (missingIds.length > 0) {
        const { data: extraProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', missingIds);
        const extraMap = (extraProfiles || []).reduce((acc: Record<string, any>, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, any>);
        memberList = memberList.map((m: any) => ({
          ...m,
          profiles: m.profiles || extraMap[m.user_id] || null
        }));
      }
      setMembers(memberList);
      setMemberCount(memberList.length);
      if (user) {
        setIsMember((data || []).some((m: any) => m.user_id === user.id));
      } else {
        setIsMember(false);
      }
    } catch (error) {
      console.error('Error in fetchMembers:', error);
      setMembers([]);
      setMemberCount(0);
      setIsMember(false);
    }
  };

  // Join group
  const joinGroup = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({ user_id: user.id, group_name: groupName });
      if (error) throw error;
      fetchMembers();
      toast({ title: 'Joined Group', description: `You joined ${groupName}`, variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to join group', variant: 'destructive' });
    }
  };

  // Leave group
  const leaveGroup = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('user_id', user.id)
        .eq('group_name', groupName);
      if (error) throw error;
      fetchMembers();
      toast({ title: 'Left Group', description: `You left ${groupName}`, variant: 'info' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to leave group', variant: 'destructive' });
    }
  };

  // Fetch members on mount and when groupName/user changes
  useEffect(() => {
    if (groupName) {
      fetchMembers();
    }
    // eslint-disable-next-line
  }, [groupName, user]);

  return {
    messages,
    newMessage,
    setNewMessage,
    loading,
    initialLoading,
    scrollRef,
    user,
    sendMessage,
    deleteMessage,
    members,
    memberCount,
    isMember,
    joinGroup,
    leaveGroup
  };
};
