import { Document, Types } from 'mongoose';

export interface IUpdateNews extends Document {
  title: string;
  description: string;
  attachment?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
