export interface LocalizedText {
  en: string;
  bn: string;
}

export const TAX_TYPE_VALUES = [
  'income_tax',
  'income_tax_government',
  'income_tax_non_government',
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
  'housewife_tax_return',
  'agriculture_tax_return',
  'non_resident_bangladeshis',
] as const;

export type TaxTypeValue = (typeof TAX_TYPE_VALUES)[number];

export interface Taxtypes {
  _id?: string;
  title: LocalizedText;
  rate: number;
  value: TaxTypeValue;
  icon?: string;
  tax_orders_id?: string[];
  description: LocalizedText;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
