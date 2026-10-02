import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    const { consultationId, role } = await req.json();

    const agoraAppId = Deno.env.get('AGORA_APP_ID');
    const agoraAppCert = Deno.env.get('AGORA_APP_CERTIFICATE');
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');

    let provider: 'agora' | 'twilio' | 'local' = 'local';
    let token = '';
    let roomId = `call-${consultationId}-${Date.now()}`;

    if (agoraAppId && agoraAppCert) {
      provider = 'agora';
      token = generateAgoraToken(agoraAppId, agoraAppCert, roomId, role === 'caller' ? 1 : 2);
    } else if (twilioAccountSid) {
      provider = 'twilio';
      token = `twilio-placeholder-${Date.now()}`;
    }

    return new Response(
      JSON.stringify({ token, room_id: roomId, provider }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateAgoraToken(appId: string, appCert: string, channel: string, uid: number): string {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const expireTimestamp = currentTimestamp + 3600;
  return `${appId}.${channel}.${uid}.${expireTimestamp}.placeholder`;
}
