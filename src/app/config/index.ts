import dotenv from 'dotenv';
import path from 'path';

const envPath =
  process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), '.env.prod')
    : path.join(process.cwd(), '.env');

dotenv.config({ path: envPath });

export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  reset_pass_ui_link: process.env.RESET_UI_LINK,
  client_url: process.env.CLIENT_URL,
  database_url: process.env.DATABASE_URL,
  bcrypt_salt_rounds: process.env.SALT,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  // Defaults matter: with an undefined `expiresIn`, jsonwebtoken mints a token
  // that never expires.
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || '10d',
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '365d',
  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
  email_user: process.env.EMAIL_USER,
  email_pass: process.env.EMAIL_PASS,
  // EPS payment gateway
  eps: {
    // No live default on purpose: production must set it explicitly, and a
    // sandbox URL there is refused (see `assertEpsConfigured` in utils/eps).
    base_url: process.env.EPS_BASE_URL || 'https://sandboxpgapi.eps.com.bd',
    merchant_id: process.env.EPS_MERCHANT_ID,
    store_id: process.env.EPS_STORE_ID,
    username: process.env.EPS_USERNAME,
    password: process.env.EPS_PASSWORD,
    hash_key: process.env.EPS_HASH_KEY,
    // A deployed dev server runs with NODE_ENV=production but must use the
    // sandbox; it opts in explicitly. Never set this on the live server.
    allow_sandbox: process.env.EPS_ALLOW_SANDBOX === 'true',
  },

  // sms
  sms_user_name: process.env.SMS_API_USERNAME,
  sms_api_key: process.env.SMS_API_KEY,
  sms_api_end_point: process.env.SMS_API_END_POINT,
};
