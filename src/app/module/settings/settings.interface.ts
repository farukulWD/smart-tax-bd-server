import { Document } from 'mongoose';

export interface ISettings extends Document {
  key: string;
  service_fee: number;
  createdAt?: Date;
  updatedAt?: Date;
}
