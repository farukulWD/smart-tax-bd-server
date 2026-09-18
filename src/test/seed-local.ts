/**
 * Wipes a LOCAL database and fills it with the test fixtures in their
 * production-today shape, then runs the income-source migration on it — so the
 * admin, web and app can be clicked through against realistic migrated data.
 *
 * Run: pnpm seed:local
 *
 * Seeds `smarttax_e2e` on the local mongod. Set DATABASE_URL in the shell to
 * pick another local database. `.env` is deliberately ignored here: it points
 * at the shared dev cluster, and this script drops whatever it connects to.
 * Any non-local host is refused.
 */
import { SHELL_DATABASE_URL } from './env';
import mongoose from 'mongoose';
import { runMigration } from '../scripts/migrate-income-sources-to-tax-types';
import {
  FIXTURE_PASSWORD,
  FIXTURE_USERS,
  seedCatalog,
  seedUsers,
} from './fixtures';
import { connectTestDatabase, resetTestDatabase } from './setup';

const DEFAULT_SEED_DATABASE_URL = 'mongodb://127.0.0.1:27017/smarttax_e2e';

const seed = async () => {
  await connectTestDatabase(SHELL_DATABASE_URL ?? DEFAULT_SEED_DATABASE_URL);
  await resetTestDatabase();

  const { userId } = await seedUsers();
  await seedCatalog(userId, { legacy: true });

  const report = await runMigration({ apply: true });
  if (report.status !== 'applied') {
    throw new Error(`Migration did not apply: ${JSON.stringify(report)}`);
  }

  console.log(
    `Seeded ${mongoose.connection.name}. Password for both users: ${FIXTURE_PASSWORD}`,
  );
  Object.entries(FIXTURE_USERS).forEach(([role, user]) =>
    console.log(`  ${role}: ${user.mobile} / ${user.email}`),
  );
};

seed()
  .then(() => mongoose.disconnect())
  .catch(async err => {
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
  });
