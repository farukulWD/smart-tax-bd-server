import { model, Schema } from 'mongoose';
import { Taxtypes } from './tax.types.interface';

const taxTypesSchema = new Schema<Taxtypes>({
  name:{ 
    type: String, 
    required: true 
  },
  rate: { 
    type: Number, 

  },
  type: { 
    type: String, 
    required: true 
  },
  tax_orders_id: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Tax',
    },
  ],
  description: { 
    type: String 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
});

export default model<Taxtypes>('Taxtype', taxTypesSchema);
