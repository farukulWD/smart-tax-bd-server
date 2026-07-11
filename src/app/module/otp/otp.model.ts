import { Schema, model } from 'mongoose';
import { TOtp } from './otp.interface';

const otpSchema = new Schema<TOtp>(
  {
    phone: {
      type: String,
      required: true,
      unique: true, // one active OTP per number
    },
    hash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// TTL: MongoDB deletes the document once `expiresAt` passes (expireAfterSeconds: 0).
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = model<TOtp>('Otp', otpSchema);
