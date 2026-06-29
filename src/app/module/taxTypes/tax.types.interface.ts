export interface LocalizedText {
  en: string;
  bn: string;
}

export interface Taxtypes {
  _id?: string;
  title: LocalizedText;
  rate: number;
  value:
    | 'income_tax'
    | 'house_rental_tax'
    | 'property_tax'
    | 'business_tax'
    | 'import_duty'
    | 'vat'
    | 'excise_duty'
    | 'customs_duty'
    | 'capital_gains_tax'
    | 'gift_tax'
    | 'inheritance_tax'
    | 'sales_tax'
    | 'service_tax'
    | 'entertainment_tax'
    | 'environmental_tax'
    | 'wealth_tax';
  icon?: string;
  tax_orders_id?: string[];
  description: LocalizedText;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
