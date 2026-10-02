/**
 * WebRTC Call Manager — production integration framework for Agora.io / Twilio.
 *
 * In production, set these env vars on the Supabase Edge Function:
 *   AGORA_APP_ID, AGORA_APP_CERTIFICATE
 *   TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET
 *
 * The edge function `webrtc-token` generates real tokens.
 * In dev mode (no credentials), falls back to local getUserMedia only.
 */

export type WebRTCProvider = 'agora' | 'twilio' | 'local';

export interface CallRoom {
  id: string;
  consultation_id: string;
  room_id: string;
  provider: WebRTCProvider;
  status: 'created' | 'active' | 'ended';
  caller_token: string | null;
  callee_token: string | null;
  caller_joined: boolean;
  callee_joined: boolean;
  started_at: string;
  ended_at: string | null;
}

export interface TokenResponse {
  token: string;
  room_id: string;
  provider: WebRTCProvider;
}

/**
 * Requests a WebRTC token from the Supabase edge function.
 * Falls back to 'local' provider if the edge function is not deployed.
 */
export async function fetchWebRTCToken(
  consultationId: string,
  role: 'caller' | 'callee'
): Promise<TokenResponse> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const response = await fetch(`${supabaseUrl}/functions/v1/webrtc-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ consultationId, role }),
    });

    if (!response.ok) throw new Error('Token request failed');
    const data = await response.json();
    return {
      token: data.token,
      room_id: data.room_id,
      provider: data.provider as WebRTCProvider,
    };
  } catch {
    return { token: '', room_id: `local-${consultationId}`, provider: 'local' };
  }
}

/**
 * Agora client placeholder.
 * In production: `npm install agora-rtc-sdk-ng` and initialize here.
 */
export function createAgoraClient(appId: string) {
  console.info('[WebRTC] Agora client would initialize with appId:', appId);
  return null;
}

/**
 * Twilio client placeholder.
 * In production: `npm install twilio-video` and connect here.
 */
export function createTwilioClient(token: string) {
  console.info('[WebRTC] Twilio client would connect with token:', token.slice(0, 10) + '...');
  return null;
}

/**
 * Local media stream helper — used for both dev and production (local preview).
 */
export async function getLocalStream(video: boolean): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: video ? { width: 1280, height: 720, facingMode: 'user' } : false,
    audio: { echoCancellation: true, noiseSuppression: true },
  });
}
