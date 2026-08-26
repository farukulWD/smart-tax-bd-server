import { IncomeSource } from '../Tax/tax.interface';
import { TaxTypeValue } from '../taxTypes/tax.types.interface';

/**
 * The document catalog as it was hardcoded before file names became an
 * admin-managed collection. Two jobs remain:
 *
 * 1. `getRequiredDocumentsFromTax` falls back to these per key, so an order
 *    still gets its upload slots for a tax type or income source nobody has
 *    curated in the admin yet.
 * 2. `src/scripts/seed-file-names.ts` seeds the `FileName` collection and
 *    backfills `Taxtype.required_files` from them.
 *
 * Once every tax type has `required_files` set, these are dead weight kept only
 * as a safety net — edit the catalog in the admin, not here.
 */

export const COMMON_REQUIRED_DOCUMENTS = [
  'TIN Certificate',
  'NID Copy',
  'Bank Statement',
];

export const INCOME_SOURCE_DOCUMENT_MAP: Partial<
  Record<IncomeSource, string[]>
> = {
  [IncomeSource.GovtJob]: ['Salary Statement', 'Tax Deduction Copy'],
  [IncomeSource.PrivateJob]: ['Salary Statement', 'Tax Deduction Copy'],
  [IncomeSource.Business]: [
    'Trade License',
    'Purchase Statement',
    'Sales or Received Statement',
    'Profit & Loss Statement',
    'Balance Sheet',
  ],
  [IncomeSource.Rent]: ['Tax Token'],
  [IncomeSource.Agriculture]: ['Others Documents'],
  [IncomeSource.FinancialAsset]: [
    'DPS Certificate',
    'FDR Certificate',
    'Sonchoypotro Certificate',
    'Insurance Certificate',
    'Share Certificate',
    'Pension Scheme Certificate',
  ],
  [IncomeSource.CapitalGain]: [
    'Land Purchase Documents',
    'Flat Purchase Documents',
    'Vehicle Purchase Documents',
  ],
  [IncomeSource.OthersSource]: ['Others Documents'],
  [IncomeSource.ForignRemitance]: ['Bank Statement'],
};

const BUSINESS_DOCUMENTS = [
  'Trade License',
  'Purchase Statement',
  'Sales or Received Statement',
  'Profit & Loss Statement',
  'Balance Sheet',
];

export const TAX_TYPE_DOCUMENT_MAP: Partial<Record<TaxTypeValue, string[]>> = {
  income_tax: ['Salary Statement', 'Tax Deduction Copy'],
  income_tax_government: ['Salary Statement', 'Tax Deduction Copy'],
  income_tax_non_government: ['Salary Statement', 'Tax Deduction Copy'],
  business_tax: BUSINESS_DOCUMENTS,
  sales_tax: BUSINESS_DOCUMENTS,
  vat: BUSINESS_DOCUMENTS,
  service_tax: BUSINESS_DOCUMENTS,
  import_duty: BUSINESS_DOCUMENTS,
  excise_duty: BUSINESS_DOCUMENTS,
  customs_duty: BUSINESS_DOCUMENTS,
  entertainment_tax: BUSINESS_DOCUMENTS,
  environmental_tax: BUSINESS_DOCUMENTS,
  house_rental_tax: ['Tax Token'],
  property_tax: ['Tax Token'],
  capital_gains_tax: [
    'Land Purchase Documents',
    'Flat Purchase Documents',
    'Vehicle Purchase Documents',
  ],
  gift_tax: ['Others Documents'],
  inheritance_tax: ['Others Documents'],
  wealth_tax: [
    'DPS Certificate',
    'FDR Certificate',
    'Sonchoypotro Certificate',
    'Insurance Certificate',
    'Share Certificate',
    'Pension Scheme Certificate',
  ],
  housewife_tax_return: ['Others Documents'],
  agriculture_tax_return: ['Others Documents'],
  non_resident_bangladeshis: ['Bank Statement', 'Others Documents'],
};

/**
 * Documents added by order-level booleans rather than by a tax type or income
 * source. Seeded into the catalog so admins can rename/translate them, but the
 * rules that add them stay in `getRequiredDocumentsFromTax`.
 */
export const FLAG_DRIVEN_DOCUMENTS = [
  'Notice from Income Tax Office',
  'Balance Sheet',
];

/**
 * Names that exist in the catalog without being wired to any rule yet — kept so
 * an admin can attach them to a tax type from the UI. Sourced from the enum
 * that used to live in `files.interface.ts`.
 */
export const UNMAPPED_DOCUMENTS = ['GPF/PF Statement', 'Loan Certificate'];
