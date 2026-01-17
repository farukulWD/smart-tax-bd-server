import { Types } from 'mongoose';

export interface Ifile {
  _id?: string;
  name: string;
  type: string;
  file: string;
  userId: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
