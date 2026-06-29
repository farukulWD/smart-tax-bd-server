import { model, Schema } from 'mongoose';
import { LocalizedText, Taxtypes } from './tax.types.interface';

const localizedTextSchema = new Schema<LocalizedText>(
  {
    en: { type: String, required: true },
    bn: { type: String, required: true },
  },
  { _id: false },
);

const taxTypesSchema = new Schema<Taxtypes>({
  title: {
    type: localizedTextSchema,
    required: true,
  },
  rate: {
    type: Number,
  },
  value: {
    type: String,
    required: true,
    enum: [
      'income_tax',
      'house_rental_tax',
      'property_tax',
      'business_tax',
      'import_duty',
      'vat',
      'excise_duty',
      'customs_duty',
      'capital_gains_tax',
      'gift_tax',
      'inheritance_tax',
      'sales_tax',
      'service_tax',
      'entertainment_tax',
      'environmental_tax',
      'wealth_tax',
    ],
  },
  icon: {
    type: String,
  },
  tax_orders_id: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Tax',
    },
  ],
  description: {
    type: localizedTextSchema,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default model<Taxtypes>('Taxtype', taxTypesSchema);
