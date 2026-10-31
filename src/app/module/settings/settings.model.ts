import { Schema, model } from 'mongoose';
import { ISettings } from './settings.interface';
import { DEFAULT_SERVICE_FEE, SETTINGS_KEY } from './settings.constant';

const settingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: SETTINGS_KEY,
    },
    service_fee: {
      type: Number,
      required: true,
      min: 0,
      default: DEFAULT_SERVICE_FEE,
    },
  },
  { timestamps: true },
);

export const Settings = model<ISettings>('Settings', settingsSchema);
