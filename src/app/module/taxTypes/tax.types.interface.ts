import { Types } from 'mongoose';

export interface LocalizedText {
  en: string;
  bn: string;
}

/**
 * The keys tax types were limited to before `value` became an admin-typed key.
 * Only `TAX_TYPE_DOCUMENT_MAP` still uses them, as a per-key document fallback
 * for rows nobody has attached `required_files` to. Do not validate against
 * this list — the tax type collection decides which values exist.
 */
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
  /**
   * Stable, unique key, e.g. 'brac'. `Tax.tax_types` stores these strings and
   * the app and web submit them, so renaming one detaches every order that
   * already declared it. Treat it as a key and use `title` for display copy.
   */
  value: string;
  icon?: string;
  /** File names (documents) a user must upload when ordering this tax type. */
  required_files?: Types.ObjectId[];
  tax_orders_id?: string[];
  description: LocalizedText;
  /** Display position (ascending) on the admin list, client and app. */
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
