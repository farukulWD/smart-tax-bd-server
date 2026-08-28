import { Schema } from 'mongoose';

export interface Ifile {
  _id?: string;
  name: string;
  type: string;
  file: string;
  orderId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
