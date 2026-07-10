export interface TOtp {
  phone: string; // normalised 8801XXXXXXXXX
  hash: string; // bcrypt hash of the OTP
  expiresAt: Date;
}
