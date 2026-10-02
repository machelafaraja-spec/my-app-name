import { supabase } from '@/lib/supabase';

/**
 * Push notification trigger for incoming calls.
 * Calls the Supabase edge function `push-notification` to send FCM
 * push notifications to the recipient's device(s).
 */

export async function triggerIncomingCallNotification(
  consultationId: string,
  recipientId: string,
  callerName: string,
  channel: 'chat' | 'voice' | 'video'
): Promise<{ success: boolean; message: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        consultationId,
        recipientId,
        callerName,
        channel,
        callType: channel === 'video' ? 'video' : 'voice',
      }),
    });

    const data = await response.json();
    return { success: data.success ?? false, message: data.message ?? 'Sent' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Register a device's FCM push token for the current user profile.
 */
export async function registerPushToken(
  profileId: string,
  token: string,
  platform: 'web' | 'android' | 'ios' = 'web'
): Promise<void> {
  await supabase.from('push_tokens').upsert(
    { profile_id: profileId, token, platform, is_active: true },
    { onConflict: 'token' }
  );
}
