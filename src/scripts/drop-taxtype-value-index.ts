/**
 * One-time: drop the legacy unique index on tax-type `value`.
 *
 * Removing `unique: true` from the schema does NOT drop an index that Mongoose
 * already created in MongoDB, so duplicate `value`s keep getting rejected at the
 * DB level until this runs.
 *
 * Run once:  npx ts-node --transpile-only src/scripts/drop-taxtype-value-index.ts
 */
import mongoose from 'mongoose';
import config from '../app/config';

async function dropIndex() {
  await mongoose.connect(config.database_url as string);
  const collection = mongoose.connection.collection('taxtypes');

  const before = (await collection.indexes()).map((i) => i.name);
  console.log('Indexes before:', before);

  try {
    await collection.dropIndex('value_1');
    console.log('Dropped index value_1');
  } catch (err) {
    console.log('dropIndex note:', (err as Error).message);
  }

  const after = (await collection.indexes()).map((i) => i.name);
  console.log('Indexes after:', after);

  await mongoose.disconnect();
}

dropIndex()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
