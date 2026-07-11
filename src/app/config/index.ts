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
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
  email_user: process.env.EMAIL_USER,
  email_pass: process.env.EMAIL_PASS,
  // sslcommerz config
  store_id: process.env.STORE_ID,
  store_password: process.env.STORE_PASSWORD,
  is_live: process.env.IS_LIVE === 'true',
  payment_base_url: process.env.PAYMENT_BASE_URL,

  // sms
  sms_user_name: process.env.SMS_API_USERNAME,
  sms_api_key: process.env.SMS_API_KEY,
  sms_api_end_point: process.env.SMS_API_END_POINT,
};
