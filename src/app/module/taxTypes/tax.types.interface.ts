export interface Taxtypes extends Document {
  _id?: string;
  name: string;
  rate: number;
  type: string;
  description: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
