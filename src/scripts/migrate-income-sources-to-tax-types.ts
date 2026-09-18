/**
 * One-time: move orders off income sources and onto tax types.
 *
 * 1. Makes tax-type `value` unique. In each group sharing a value the oldest
 *    row keeps it — existing orders most likely meant that one — and newer
 *    rows get a key derived from their English title (BRAC → `brac`). Then
 *    builds the unique index the schema now declares.
 * 2. Copies every order's `source_of_income` into `tax_types` through
 *    INCOME_SOURCE_TO_TAX_TYPE and unsets `source_of_income`.
 * 3. Drops the `incomesources` collection.
 *
 * Nothing is written unless every income source on every order has a mapping
 * and every mapped tax type exists; the report lists what is missing instead.
 * Not transactional, but each step is idempotent, so re-running after a
 * failure finishes the job.
 *
 * Take a mongodump first — step 3 cannot be undone without one.
 *
 * Run (uses DATABASE_URL, or .env / .env.prod via NODE_ENV):
 *   npx ts-node --transpile-only src/scripts/migrate-income-sources-to-tax-types.ts           # dry run
 *   npx ts-node --transpile-only src/scripts/migrate-income-sources-to-tax-types.ts --apply
 *   npx ts-node --transpile-only src/scripts/migrate-income-sources-to-tax-types.ts --verify  # exit 1 on problems
 */
import mongoose, { Types } from 'mongoose';
import config from '../app/config';

export const INCOME_SOURCE_TO_TAX_TYPE = new Map<string, string>([
  ['Income from Govt.Job', 'income_tax_government'],
  ['Income from Private Job', 'income_tax_non_government'],
  ['Income from Business', 'business_tax'],
  ['Income from Rent', 'house_rental_tax'],
  ['Income from Agriculture', 'agriculture_tax_return'],
  ['Income from Financial Asset', 'wealth_tax'],
  ['Income from Capital Gain', 'sales_tax'],
  ['Income from Forign Remitance', 'non_resident_bangladeshis'],
  ['BRAC', 'brac'],
]);

type TTaxTypeRow = {
  _id: Types.ObjectId;
  value: string;
  title?: { en?: string };
  createdAt?: Date;
};

type TOrderRow = {
  _id: Types.ObjectId;
  tax_types?: string[];
  source_of_income?: unknown;
};

type TRename = { id: string; title: string; from: string; to: string };

export type TMigrationReport = {
  status: 'dry-run' | 'blocked' | 'applied';
  renames: TRename[];
  /** Orders per income source value, across orders that still carry one. */
  sourceCounts: Record<string, number>;
  unmappedSources: { value: string; orders: number }[];
  missingTargets: { source: string; target: string }[];
  ordersToUpdate: number;
  changes: {
    taxTypesRenamed: number;
    ordersUpdated: number;
    incomeSourcesDropped: boolean;
  };
};

const db = () => {
  const database = mongoose.connection.db;
  if (!database) throw new Error('Connect to MongoDB before migrating');
  return database;
};

const collectionExists = async (name: string) =>
  (await db().listCollections({ name }, { nameOnly: true }).toArray()).length >
  0;

const isValueIndex = (index: { key: Record<string, unknown> }) =>
  Object.keys(index.key).length === 1 && index.key.value === 1;

const taxTypeIndexes = async () =>
  (await collectionExists('taxtypes'))
    ? db().collection('taxtypes').indexes()
    : [];

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const createdAtMs = (row: TTaxTypeRow) =>
  row.createdAt ? new Date(row.createdAt).getTime() : 0;

const planRenames = (taxTypes: TTaxTypeRow[]): TRename[] => {
  const taken = new Set(taxTypes.map(row => row.value));
  const groups = new Map<string, TTaxTypeRow[]>();
  taxTypes.forEach(row =>
    groups.set(row.value, [...(groups.get(row.value) ?? []), row]),
  );

  const renames: TRename[] = [];
  groups.forEach((rows, value) => {
    if (rows.length < 2) return;

    const [, ...newer] = [...rows].sort(
      (a, b) =>
        createdAtMs(a) - createdAtMs(b) || String(a._id).localeCompare(String(b._id)),
    );

    newer.forEach(row => {
      const base = slugify(row.title?.en ?? '') || `${value}_copy`;
      let to = base;
      for (let suffix = 2; taken.has(to); suffix += 1) {
        to = `${base}_${suffix}`;
      }
      taken.add(to);
      renames.push({
        id: String(row._id),
        title: row.title?.en ?? '',
        from: value,
        to,
      });
    });
  });

  return renames;
};

const sourcesOf = (order: TOrderRow) =>
  Array.isArray(order.source_of_income)
    ? (order.source_of_income as unknown[]).map(String)
    : [];

export const runMigration = async ({
  apply,
}: {
  apply: boolean;
}): Promise<TMigrationReport> => {
  const taxTypes = await db()
    .collection<TTaxTypeRow>('taxtypes')
    .find({}, { projection: { value: 1, title: 1, createdAt: 1 } })
    .sort({ _id: 1 })
    .toArray();
  const renames = planRenames(taxTypes);

  const renamedTo = new Map(renames.map(rename => [rename.id, rename.to]));
  const finalValues = new Set(
    taxTypes.map(row => renamedTo.get(String(row._id)) ?? row.value),
  );

  const legacyOrders = await db()
    .collection<TOrderRow>('taxes')
    .find(
      { source_of_income: { $exists: true } },
      { projection: { tax_types: 1, source_of_income: 1 } },
    )
    .toArray();

  const sourceCounts: Record<string, number> = {};
  legacyOrders.forEach(order =>
    new Set(sourcesOf(order)).forEach(source => {
      sourceCounts[source] = (sourceCounts[source] ?? 0) + 1;
    }),
  );

  const unmappedSources = Object.entries(sourceCounts)
    .filter(([value]) => !INCOME_SOURCE_TO_TAX_TYPE.has(value))
    .map(([value, orders]) => ({ value, orders }));

  const missingTargets = Object.keys(sourceCounts)
    .filter(source => INCOME_SOURCE_TO_TAX_TYPE.has(source))
    .map(source => ({ source, target: INCOME_SOURCE_TO_TAX_TYPE.get(source)! }))
    .filter(({ target }) => !finalValues.has(target));

  const report: TMigrationReport = {
    status: 'dry-run',
    renames,
    sourceCounts,
    unmappedSources,
    missingTargets,
    ordersToUpdate: legacyOrders.length,
    changes: {
      taxTypesRenamed: 0,
      ordersUpdated: 0,
      incomeSourcesDropped: false,
    },
  };

  if (!apply) return report;

  if (unmappedSources.length || missingTargets.length) {
    report.status = 'blocked';
    return report;
  }

  // ---- 1. unique tax-type values --------------------------------------------
  for (const rename of renames) {
    const result = await db()
      .collection('taxtypes')
      .updateOne(
        { _id: new Types.ObjectId(rename.id), value: rename.from },
        { $set: { value: rename.to, updatedAt: new Date() } },
      );
    report.changes.taxTypesRenamed += result.modifiedCount;
  }

  const valueIndex = (await taxTypeIndexes()).find(isValueIndex);
  if (valueIndex && !valueIndex.unique && valueIndex.name) {
    await db().collection('taxtypes').dropIndex(valueIndex.name);
  }
  if (!valueIndex?.unique) {
    await db()
      .collection('taxtypes')
      .createIndex({ value: 1 }, { unique: true, name: 'value_1' });
  }

  // ---- 2. orders onto tax types ---------------------------------------------
  if (legacyOrders.length) {
    const result = await db()
      .collection('taxes')
      .bulkWrite(
        legacyOrders.map(order => ({
          updateOne: {
            filter: { _id: order._id },
            update: {
              $set: {
                tax_types: Array.from(
                  new Set([
                    ...(order.tax_types ?? []),
                    ...sourcesOf(order).map(
                      source => INCOME_SOURCE_TO_TAX_TYPE.get(source)!,
                    ),
                  ]),
                ),
              },
              $unset: { source_of_income: '' },
            },
          },
        })),
      );
    report.changes.ordersUpdated = result.modifiedCount;
  }

  // ---- 3. retire the income source catalog ----------------------------------
  if (await collectionExists('incomesources')) {
    await db().collection('incomesources').drop();
    report.changes.incomeSourcesDropped = true;
  }

  report.status = 'applied';
  return report;
};

export const verifyMigration = async () => {
  const problems: string[] = [];
  const warnings: string[] = [];

  const values = (
    await db()
      .collection<TTaxTypeRow>('taxtypes')
      .find({}, { projection: { value: 1 } })
      .toArray()
  ).map(row => row.value);

  const counts = new Map<string, number>();
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1));
  counts.forEach((count, value) => {
    if (count > 1) {
      problems.push(`duplicate tax type value "${value}" on ${count} rows`);
    }
  });

  if (!(await taxTypeIndexes()).some(index => isValueIndex(index) && index.unique)) {
    problems.push('missing unique index on taxtypes.value');
  }

  const withSource = await db()
    .collection('taxes')
    .countDocuments({ source_of_income: { $exists: true } });
  if (withSource) {
    problems.push(`${withSource} order(s) still have source_of_income`);
  }

  if (await collectionExists('incomesources')) {
    problems.push('incomesources collection still exists');
  }

  // Orders may predate a tax type an admin later deleted; worth knowing, but
  // not something this migration caused or can fix.
  const known = new Set(values);
  const orphaned = (await db().collection('taxes').distinct('tax_types')).filter(
    value => !known.has(value),
  );
  if (orphaned.length) {
    warnings.push(
      `orders reference tax type values with no tax type: ${orphaned.join(', ')}`,
    );
  }

  return { problems, warnings };
};

const printReport = (report: TMigrationReport) => {
  console.log(`Status: ${report.status}`);
  console.log('\nTax type renames (newer duplicates):');
  report.renames.forEach(rename =>
    console.log(`  ${rename.id} "${rename.title}": ${rename.from} → ${rename.to}`),
  );
  if (!report.renames.length) console.log('  none');

  console.log(`\nOrders carrying source_of_income: ${report.ordersToUpdate}`);
  Object.entries(report.sourceCounts).forEach(([source, orders]) =>
    console.log(
      `  ${source} (${orders}) → ${INCOME_SOURCE_TO_TAX_TYPE.get(source) ?? 'UNMAPPED'}`,
    ),
  );

  if (report.unmappedSources.length) {
    console.log('\nBLOCKER — income sources with no mapping:');
    report.unmappedSources.forEach(({ value, orders }) =>
      console.log(`  "${value}" on ${orders} order(s)`),
    );
  }
  if (report.missingTargets.length) {
    console.log('\nBLOCKER — mapped tax types that do not exist:');
    report.missingTargets.forEach(({ source, target }) =>
      console.log(`  "${source}" → ${target}`),
    );
  }

  if (report.status === 'applied') {
    console.log('\nChanges:', report.changes);
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  await mongoose.connect(config.database_url as string);
  console.log(
    `Database: ${mongoose.connection.host}/${mongoose.connection.name}\n`,
  );

  try {
    if (args.includes('--verify')) {
      const { problems, warnings } = await verifyMigration();
      warnings.forEach(warning => console.log(`warning: ${warning}`));
      problems.forEach(problem => console.log(`problem: ${problem}`));
      console.log(problems.length ? '\nVerify FAILED' : '\nVerify OK');
      process.exitCode = problems.length ? 1 : 0;
      return;
    }

    const report = await runMigration({ apply: args.includes('--apply') });
    printReport(report);
    if (report.status === 'blocked') process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
