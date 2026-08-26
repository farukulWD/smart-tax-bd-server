import { model, Schema } from 'mongoose';
import { Ifile } from './files.interface';

const filesSchema = new Schema<Ifile>(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Tax',
      required: true,
    },
    file: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

filesSchema.index({ userId: 1, createdAt: -1 });
filesSchema.index({ orderId: 1, createdAt: -1 });
filesSchema.index({ createdAt: -1 });

export const Files = model<Ifile>('File', filesSchema);
