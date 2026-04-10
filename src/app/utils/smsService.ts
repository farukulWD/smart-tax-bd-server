import axios from 'axios';
import config from '../config';

/**
 * Normalises a Bangladeshi phone number to the 8801XXXXXXXXX format.
 * Accepts:  01XXXXXXXXX | +8801XXXXXXXXX | 8801XXXXXXXXX
 */
export const formatBDPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, ''); // strip non-digits

  if (/^880[1-9]\d{9}$/.test(digits)) return digits; // already 8801XXXXXXXXX
  if (/^0[1-9]\d{9}$/.test(digits)) return `880${digits.slice(1)}`; // 01XXXXXXXXX
  if (/^[1-9]\d{9}$/.test(digits)) return `8801${digits}`; // 1XXXXXXXXX (9 digits)

  throw new Error(`Invalid Bangladeshi phone number: ${phone}`);
};

/**
 * Send an SMS via the SendMySMS API (Bangladesh).
 *
 * Required env vars:
 *   SMS_API_END_POINT  – full API URL  (e.g. https://api.sendmysms.com/api/v1/send)
 *   SMS_API_USERNAME   – your account username
 *   SMS_API_KEY        – your API key
 */
export const sendSMS = async (
  phone: string,
  message: string,
): Promise<void> => {
  const endpoint = config.sms_api_end_points;
  const username = config.sms_user_name;
  const apiKey = config.sms_api_key;

  if (!endpoint || !username || !apiKey) {
    throw new Error(
      'SMS configuration missing: ensure SMS_API_END_POINT, SMS_API_USERNAME, and SMS_API_KEY are set',
    );
  }

  const mobile = formatBDPhone(phone);

  const { data } = await axios.get(endpoint, {
    params: {
      user: username,
      key: apiKey,
      to: mobile,
      msg: message,
    },
    timeout: 10_000,
  });

  // API returns { status: 'OK', response: '...' }
  if (data?.status?.toUpperCase() !== 'OK') {
    throw new Error(`SMS API error: ${data?.response ?? JSON.stringify(data)}`);
  }
};
