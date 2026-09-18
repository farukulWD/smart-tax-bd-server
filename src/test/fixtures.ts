/**
 * Shared data for the server tests and `pnpm seed:local`.
 *
 * Mirrors production as of 2026-09-17: BRAC and "Tax Return for Student Visa"
 * share `income_tax`, and orders still carry `source_of_income`. Everything is
 * written through the native driver because the current schemas reject that
 * legacy shape.
 *
 * The expected post-migration values are spelled out here on purpose rather
 * than imported from the migration script, so the tests check the script
 * against an independent answer.
 */
import mongoose, { Types } from 'mongoose';
import { User } from '../app/module/users/user.model';

export const FIXTURE_PASSWORD = 'Fixture@1234';

export const FIXTURE_USERS = {
  admin: {
    name: 'Fixture Admin',
    mobile: '01700000001',
    email: 'admin@fixture.test',
    role: 'admin',
  },
  user: {
    name: 'Fixture User',
    mobile: '01700000002',
    email: 'user@fixture.test',
    role: 'user',
  },
} as const;

export const FILE_NAMES = {
  tin: { _id: new Types.ObjectId(), name: 'TIN Certificate', isCommon: true },
  nid: { _id: new Types.ObjectId(), name: 'NID Copy', isCommon: true },
  bank: { _id: new Types.ObjectId(), name: 'Bank Statement', isCommon: true },
  brac: {
    _id: new Types.ObjectId(),
    name: 'BRAC Salary Certificate',
    isCommon: false,
  },
  trade: { _id: new Types.ObjectId(), name: 'Trade License', isCommon: false },
};

export const COMMON_FILE_NAMES = ['TIN Certificate', 'NID Copy', 'Bank Statement'];

type TTaxTypeFixture = {
  _id: Types.ObjectId;
  legacyValue: string;
  value: string;
  en: string;
  bn: string;
  createdAt: Date;
  requiredFiles: Types.ObjectId[];
  isActive: boolean;
};

const taxType = (
  value: string,
  en: string,
  bn: string,
  overrides: Partial<TTaxTypeFixture> = {},
): TTaxTypeFixture => ({
  _id: new Types.ObjectId(),
  legacyValue: value,
  value,
  en,
  bn,
  createdAt: new Date('2026-06-01T00:00:00Z'),
  requiredFiles: [],
  isActive: true,
  ...overrides,
});

export const TAX_TYPES = {
  brac: taxType('brac', 'BRAC', 'BRAC হতে আয়', {
    legacyValue: 'income_tax',
    createdAt: new Date('2026-09-15T16:01:46Z'),
    requiredFiles: [FILE_NAMES.brac._id],
  }),
  govt: taxType(
    'income_tax_government',
    "Income from gov't job",
    'সরকারি চাকরি হতে আয়',
  ),
  nonGovt: taxType(
    'income_tax_non_government',
    'Income from non-government job',
    'বেসরকারি চাকরি হতে আয়',
  ),
  rent: taxType('house_rental_tax', 'Rental Income', 'ভাড়া হতে আয়'),
  business: taxType(
    'business_tax',
    'Income from Business and Profession',
    'ব্যবসা ও পেশা হতে আয়',
    { requiredFiles: [FILE_NAMES.trade._id] },
  ),
  agriculture: taxType(
    'agriculture_tax_return',
    'Agricultural Income',
    'কৃষি হতে আয়',
  ),
  wealth: taxType(
    'wealth_tax',
    'Interest Income from Investments',
    'বিনিয়োগের সুদ প্র্যাপ্তি',
  ),
  sales: taxType('sales_tax', 'Income from Asset Sale', 'সম্পদ বিক্রয় হতে আয়'),
  studentVisa: taxType(
    'income_tax',
    'Tax Return for Student Visa',
    'স্টুডেন্ট ভিসার জন্য রিটার্ন',
    { createdAt: new Date('2026-07-02T00:50:21Z') },
  ),
  nrb: taxType(
    'non_resident_bangladeshis',
    'Tax Return for Non-Resident Bangladeshis (NRBs)',
    'বিদেশে অবস্থানকারীদের রিটার্ন',
  ),
  vat: taxType('vat', 'VAT', 'ভ্যাট', { isActive: false }),
};

export const LEGACY_INCOME_SOURCES = [
  'BRAC',
  'Income from Govt.Job',
  'Income from Private Job',
  'Income from Business',
  'Income from Rent',
  'Income from Agriculture',
  'Income from Financial Asset',
  'Income from Capital Gain',
  'Income from others Source',
  'Income from Forign Remitance',
];

/** One legacy order per mapped income source, plus one mixing both fields. */
export const ORDERS = [
  ['Income from Govt.Job', 'income_tax_government'],
  ['Income from Private Job', 'income_tax_non_government'],
  ['Income from Business', 'business_tax'],
  ['Income from Rent', 'house_rental_tax'],
  ['Income from Agriculture', 'agriculture_tax_return'],
  ['Income from Financial Asset', 'wealth_tax'],
  ['Income from Capital Gain', 'sales_tax'],
  ['Income from Forign Remitance', 'non_resident_bangladeshis'],
  ['BRAC', 'brac'],
]
  .map(([source, taxTypeValue]) => ({
    _id: new Types.ObjectId(),
    legacyTaxTypes: [] as string[],
    legacySources: [source],
    migratedTaxTypes: [taxTypeValue],
  }))
  .concat({
    _id: new Types.ObjectId(),
    legacyTaxTypes: ['income_tax'],
    legacySources: ['BRAC', 'Income from Private Job'],
    migratedTaxTypes: ['income_tax', 'brac', 'income_tax_non_government'],
  });

export const MIXED_ORDER = ORDERS[ORDERS.length - 1];

export const UNMAPPED_ORDER_ID = new Types.ObjectId();
export const DROPPED_SOURCE_ORDER_ID = new Types.ObjectId();

/** No tax type stands for this one, so the migration drops it. */
export const DROPPED_INCOME_SOURCE = 'Income from others Source';

/** Not in the mapping at all, so it blocks the migration. */
export const UNKNOWN_INCOME_SOURCE = 'Income from Moonlighting';

const collection = (name: string) => mongoose.connection.collection(name);

export const seedUsers = async () => {
  const [admin, user] = await Promise.all(
    Object.values(FIXTURE_USERS).map(fixture =>
      User.create({
        ...fixture,
        password: FIXTURE_PASSWORD,
        isMobileVerify: true,
      }),
    ),
  );
  // `TUser._id` is typed as a string, though Mongo hands back an ObjectId
  return {
    adminId: new Types.ObjectId(String(admin._id)),
    userId: new Types.ObjectId(String(user._id)),
  };
};

const orderDoc = (
  userId: Types.ObjectId,
  fields: Record<string, unknown>,
) => ({
  userId,
  personal_information: {
    name: FIXTURE_USERS.user.name,
    phone: FIXTURE_USERS.user.mobile,
    are_you_student: false,
    are_you_house_wife: false,
  },
  status: 'payment_pending',
  current_step: 2,
  are_you_get_notice_from_tax_office: false,
  income_from_partnership_firm: false,
  income_from_ldt_company: false,
  tax_year: '2026-2027',
  documents: [],
  tax_payable_amount: 0,
  is_tax_payable_amount_paid: false,
  tax_paid_amount: 0,
  fee_amount: 1000,
  is_fee_amount_paid: false,
  fee_due_amount: 0,
  is_fee_due_amount_paid: false,
  total_amount: 1000,
  total_paid_amount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...fields,
});

/**
 * `legacy: true` seeds production as it is today; `legacy: false` seeds the
 * shape the migration is expected to leave behind.
 */
export const seedCatalog = async (
  userId: Types.ObjectId,
  { legacy }: { legacy: boolean },
) => {
  const now = new Date();

  await collection('filenames').insertMany(
    Object.values(FILE_NAMES).map((file, index) => ({
      ...file,
      label: { en: file.name, bn: file.name },
      order: index,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })),
  );

  await collection('taxtypes').insertMany(
    Object.values(TAX_TYPES).map((fixture, index) => ({
      _id: fixture._id,
      title: { en: fixture.en, bn: fixture.bn },
      description: { en: fixture.en, bn: fixture.bn },
      rate: 1000,
      value: legacy ? fixture.legacyValue : fixture.value,
      required_files: fixture.requiredFiles,
      tax_orders_id: [],
      order: index,
      isActive: fixture.isActive,
      createdAt: fixture.createdAt,
      updatedAt: fixture.createdAt,
    })),
  );

  if (legacy) {
    await collection('incomesources').insertMany(
      LEGACY_INCOME_SOURCES.map((value, index) => ({
        value,
        title: { en: value, bn: value },
        required_files: [],
        order: index,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  await collection('taxes').insertMany(
    ORDERS.map(order =>
      orderDoc(
        userId,
        legacy
          ? {
              _id: order._id,
              tax_types: order.legacyTaxTypes,
              source_of_income: order.legacySources,
            }
          : { _id: order._id, tax_types: order.migratedTaxTypes },
      ),
    ),
  );
};

export const seedUnmappedOrder = async (userId: Types.ObjectId) => {
  await collection('taxes').insertOne(
    orderDoc(userId, {
      _id: UNMAPPED_ORDER_ID,
      tax_types: [],
      source_of_income: [UNKNOWN_INCOME_SOURCE],
    }),
  );
};

/**
 * Mirrors the one production order that declares "others": it keeps the tax
 * types its other sources map to, and loses only the dropped one.
 */
export const seedDroppedSourceOrder = async (userId: Types.ObjectId) => {
  await collection('taxes').insertOne(
    orderDoc(userId, {
      _id: DROPPED_SOURCE_ORDER_ID,
      tax_types: [],
      source_of_income: [DROPPED_INCOME_SOURCE, 'Income from Rent'],
    }),
  );
};
