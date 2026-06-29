/**
 * One-time migration: convert tax-type `title` / `description` from plain
 * strings to localized `{ en, bn }` objects.
 *
 * For each legacy row it copies the old string into `.en` and duplicates it
 * into `.bn` as a placeholder for the admin to translate later.
 *
 * Run once:  ts-node src/scripts/migrate-taxtype-i18n.ts
 */
import mongoose from 'mongoose';
import config from '../app/config';

type Legacyish = string | { en?: string; bn?: string } | null | undefined;

const toLocalized = (value: Legacyish): { en: string; bn: string } | null => {
  if (value == null) return null;
  if (typeof value === 'string') return { en: value, bn: value };
  // already an object — backfill any missing side from the other
  const en = value.en ?? value.bn ?? '';
  const bn = value.bn ?? value.en ?? '';
  return { en, bn };
};

const needsMigration = (value: Legacyish) =>
  typeof value === 'string' ||
  (value != null && typeof value === 'object' && (!value.en || !value.bn));

async function migrate() {
  await mongoose.connect(config.database_url as string);
  // Use the native collection to bypass schema casting on legacy docs.
  const collection = mongoose.connection.collection('taxtypes');

  const cursor = collection.find({});
  let updated = 0;
  let skipped = 0;

  for await (const doc of cursor) {
    const title = doc.title as Legacyish;
    const description = doc.description as Legacyish;

    const set: Record<string, unknown> = {};
    if (needsMigration(title)) {
      const next = toLocalized(title);
      if (next) set.title = next;
    }
    if (needsMigration(description)) {
      const next = toLocalized(description);
      if (next) set.description = next;
    }

    if (Object.keys(set).length === 0) {
      skipped += 1;
      continue;
    }

    await collection.updateOne({ _id: doc._id }, { $set: set });
    updated += 1;
  }

  console.log(`Migration complete. Updated: ${updated}, skipped: ${skipped}`);
  await mongoose.disconnect();
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
