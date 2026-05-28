/**
 * server/sms.ts — SMS notifications
 * Supports: Twilio, mock (dev mode)
 */

interface SMSResult { success: boolean; messageId?: string; error?: string }

export async function sendSMS(
  to: string,
  message: string,
  provider = process.env.SMS_PROVIDER || 'none',
  apiKey    = process.env.SMS_API_KEY  || '',
  senderId  = process.env.SMS_SENDER_ID || 'autoflow'
): Promise<SMSResult> {
  if (!to || !message) return { success: false, error: 'Missing phone or message' };

  // Normalize Algerian phone
  let phone = to.replace(/\s+/g, '').replace(/^0/, '+213');
  if (!phone.startsWith('+')) phone = '+213' + phone;

  if (provider === 'none' || !apiKey) {
    console.log(`[sms:mock] To: ${phone} | Message: ${message.slice(0, 50)}`);
    return { success: true, messageId: 'mock_' + Date.now() };
  }

  if (provider === 'twilio') {
    try {
      const [accountSid, authToken] = apiKey.split(':');
      const body = new URLSearchParams({
        To: phone, From: senderId,
        Body: message,
      });
      const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: body.toString(),
      });
      const data = await resp.json() as { sid?: string; message?: string };
      if (resp.ok && data.sid) return { success: true, messageId: data.sid };
      return { success: false, error: data.message || 'Twilio error' };
    } catch (e: unknown) {
      return { success: false, error: (e as Error).message };
    }
  }

  // Generic HTTP SMS provider
  try {
    const resp = await fetch(apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, message, from: senderId }),
    });
    return { success: resp.ok };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

export function buildShippingMessage(orderNumber: string, carrier: string, trackingNumber?: string): string {
  const tracking = trackingNumber ? `\nرقم التتبع: ${trackingNumber}` : '';
  return `autoflow: طلبك ${orderNumber} تم شحنه عبر ${carrier}.${tracking} تتبع طلبك: https://autoflow.dz/track`;
}
