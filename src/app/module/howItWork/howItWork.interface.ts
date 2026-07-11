import { Document } from 'mongoose';

export interface IHowItWork extends Document {
  icon: string;
  title: string;
  description: string;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IHowItWorkSection extends Document {
  badge?: string;
  titlePrefix: string;
  titleHighlight: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}
