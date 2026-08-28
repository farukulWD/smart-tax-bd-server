/**
 * Idempotent seed + backfill for the admin-managed document catalog.
 *
 * 1. Upserts a `FileName` row for every document the old hardcoded maps knew
 *    about, keyed on `name`. `label.bn` starts as the English text — a
 *    translate-me placeholder, same convention as migrate-taxtype-i18n.ts.
 * 2. Backfills `Taxtype.required_files` for any tax type that has none, using
 *    TAX_TYPE_DOCUMENT_MAP.
 * 3. Upserts an `IncomeSource` row per legacy enum value and backfills its
 *    `required_files` from INCOME_SOURCE_DOCUMENT_MAP.
 * 4. Unsets the retired `FileName.income_sources` field, whose mapping now
 *    lives on the income source itself.
 *
 * Safe to re-run: existing rows keep their admin edits (only missing rows are
 * inserted), and rows that already have `required_files` are left alone.
 *
 * Run:  npx ts-node --transpile-only src/scripts/seed-file-names.ts
 */
import mongoose, { Types } from 'mongoose';
import config from '../app/config';
import { FileName } from '../app/module/fileNames/fileName.model';
import taxTypesModel from '../app/module/taxTypes/tax.types.model';
import { IncomeSourceModel } from '../app/module/incomeSources/incomeSource.model';
import { IncomeSource } from '../app/module/Tax/tax.interface';
import {
  COMMON_REQUIRED_DOCUMENTS,
  FLAG_DRIVEN_DOCUMENTS,
  INCOME_SOURCE_DOCUMENT_MAP,
  TAX_TYPE_DOCUMENT_MAP,
  UNMAPPED_DOCUMENTS,
} from '../app/module/fileNames/fileName.constant';

const buildFileNames = (): string[] => {
  const names = new Set<string>();

  COMMON_REQUIRED_DOCUMENTS.forEach(name => names.add(name));
  Object.values(INCOME_SOURCE_DOCUMENT_MAP).forEach(list =>
    (list || []).forEach(name => names.add(name)),
  );
  Object.values(TAX_TYPE_DOCUMENT_MAP).forEach(list =>
    (list || []).forEach(name => names.add(name)),
  );
  [...FLAG_DRIVEN_DOCUMENTS, ...UNMAPPED_DOCUMENTS].forEach(name =>
    names.add(name),
  );

  return Array.from(names);
};

async function seed() {
  await mongoose.connect(config.database_url as string);

  // ---- 1. file names --------------------------------------------------------
  const fileNames = buildFileNames();
  const commonNames = new Set<string>(COMMON_REQUIRED_DOCUMENTS);

  const fileNameResult = await FileName.bulkWrite(
    fileNames.map((name, index) => ({
      updateOne: {
        filter: { name },
        // $setOnInsert only — an admin who retitled a label must not have that
        // overwritten by a re-run.
        update: {
          $setOnInsert: {
            name,
            label: { en: name, bn: name },
            isCommon: commonNames.has(name),
            order: index,
            isActive: true,
          },
        },
        upsert: true,
      },
    })),
  );

  console.log(
    `File names — inserted: ${fileNameResult.upsertedCount}, already present: ${
      fileNames.length - fileNameResult.upsertedCount
    }`,
  );

  const catalog = await FileName.find().select('name');
  const idByName = new Map(catalog.map(doc => [doc.name, doc._id]));
  const idsFor = (names: string[]) =>
    names
      .map(name => idByName.get(name))
      .filter((id): id is Types.ObjectId => !!id);

  // ---- 2. tax type required_files ------------------------------------------
  const taxTypes = await taxTypesModel.find({
    $or: [
      { required_files: { $exists: false } },
      { required_files: { $size: 0 } },
    ],
  });

  let taxTypesBackfilled = 0;
  for (const taxType of taxTypes) {
    const names = TAX_TYPE_DOCUMENT_MAP[taxType.value] || [];
    const ids = idsFor(names);
    if (!ids.length) {
      console.log(`  skip ${taxType.value} — no mapped documents`);
      continue;
    }
    await taxTypesModel.updateOne(
      { _id: taxType._id },
      { required_files: ids },
    );
    taxTypesBackfilled += 1;
    console.log(`  ${taxType.value} → ${names.join(', ')}`);
  }
  console.log(`Tax types — backfilled: ${taxTypesBackfilled}`);

  // ---- 3. income sources ----------------------------------------------------
  const sourceValues = Object.values(IncomeSource);

  const sourceResult = await IncomeSourceModel.bulkWrite(
    sourceValues.map((value, index) => ({
      updateOne: {
        filter: { value },
        update: {
          $setOnInsert: {
            value,
            title: { en: value, bn: value },
            required_files: idsFor(INCOME_SOURCE_DOCUMENT_MAP[value] || []),
            order: index,
            isActive: true,
          },
        },
        upsert: true,
      },
    })),
  );

  console.log(
    `Income sources — inserted: ${
      sourceResult.upsertedCount
    }, already present: ${sourceValues.length - sourceResult.upsertedCount}`,
  );

  // Backfill any pre-existing row an earlier run left without documents.
  const emptySources = await IncomeSourceModel.find({
    $or: [
      { required_files: { $exists: false } },
      { required_files: { $size: 0 } },
    ],
  });

  let sourcesBackfilled = 0;
  for (const source of emptySources) {
    const names =
      INCOME_SOURCE_DOCUMENT_MAP[source.value as IncomeSource] || [];
    const ids = idsFor(names);
    if (!ids.length) continue;
    await IncomeSourceModel.updateOne(
      { _id: source._id },
      { required_files: ids },
    );
    sourcesBackfilled += 1;
    console.log(`  ${source.value} → ${names.join(', ')}`);
  }
  console.log(`Income sources — backfilled: ${sourcesBackfilled}`);

  // ---- 4. drop the retired FileName.income_sources -------------------------
  // Straight through the driver: `income_sources` is gone from the schema, so
  // Mongoose's strict mode would silently strip it out of the $unset.
  const unset = await mongoose.connection
    .collection('filenames')
    .updateMany(
      { income_sources: { $exists: true } },
      { $unset: { income_sources: '' } },
    );
  console.log(
    `Retired FileName.income_sources — cleared on ${unset.modifiedCount} row(s)`,
  );

  await mongoose.disconnect();
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
