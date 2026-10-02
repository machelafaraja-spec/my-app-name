import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { consultationId, recipientId, callerName, channel, callType } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

    const supabase = createClient(supabaseUrl, serviceKey);

    // Look up recipient's FCM push tokens
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('profile_id', recipientId)
      .eq('is_active', true);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No active push tokens for recipient' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!fcmServerKey) {
      // Dev mode — log the notification instead of sending
      console.info('[FCM] Dev mode — would send push notification:', {
        consultationId, recipientId, callerName, channel, callType,
      });
      return new Response(
        JSON.stringify({ success: true, message: 'Dev mode — notification logged (no FCM_SERVER_KEY)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notification = {
      title: `Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call`,
      body: `${callerName} is calling you...`,
      sound: 'ringtone',
      android_channel_id: 'incoming_calls',
      tag: 'incoming_call',
      priority: 'high',
      vibrate: [0, 500, 200, 500, 200, 500],
    };

    const data = {
      consultation_id: consultationId,
      caller_name: callerName,
      channel,
      call_type: callType || 'voice',
      type: 'incoming_call',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    };

    const results = [];
    for (const t of tokens) {
      const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify({
          to: t.token,
          notification,
          data,
          priority: 'high',
          content_available: true,
        }),
      });
      results.push({ token: t.token.slice(0, 10) + '...', success: fcmResponse.ok });
    }

    return new Response(
      JSON.stringify({ success: true, sent: results.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
