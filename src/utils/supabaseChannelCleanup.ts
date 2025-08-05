import { supabase } from '@/integrations/supabase/client';

/**
 * Utility function to unsubscribe from a Supabase channel and log the result.
 * This helps prevent orphaned sockets during hot-reload or component unmounting.
 * 
 * @param channelName - The name of the channel to unsubscribe from
 */
export const unsubscribeChannel = (channelName: string): void => {
  try {
    const channel = supabase.getChannels().find(ch => ch.topic === channelName);
    
    if (channel) {
      const result = supabase.removeChannel(channel);
      console.log(`[Channel Cleanup] Successfully unsubscribed from channel "${channelName}"`, result);
    } else {
      console.warn(`[Channel Cleanup] Channel "${channelName}" not found in active channels`);
    }
  } catch (error) {
    console.error(`[Channel Cleanup] Error unsubscribing from channel "${channelName}":`, error);
  }
};

/**
 * Utility function to clean up all active Supabase channels.
 * This is useful for cleanup during hot-reload or application shutdown.
 */
export const cleanupAllChannels = (): void => {
  try {
    const channels = supabase.getChannels();
    console.log(`[Channel Cleanup] Cleaning up ${channels.length} active channels`);
    
    channels.forEach(channel => {
      const result = supabase.removeChannel(channel);
      console.log(`[Channel Cleanup] Cleaned up channel "${channel.topic}"`, result);
    });
    
    console.log(`[Channel Cleanup] All ${channels.length} channels cleaned up successfully`);
  } catch (error) {
    console.error('[Channel Cleanup] Error during cleanup of all channels:', error);
  }
};
