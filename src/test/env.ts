/**
 * Import first in every test file, before anything that pulls in `config`.
 *
 * `config` reads the environment at import time, and the local `.env` carries
 * no JWT secrets, so login would fail without these defaults. dotenv never
 * overrides a variable that is already set, so these win over `.env`.
 */
import mongoose from 'mongoose';

/**
 * `DATABASE_URL` as the shell set it, captured before `config` runs dotenv and
 * fills it in from `.env` (the shared dev cluster). Seeding uses this to tell
 * "the operator picked a database" from "nobody did".
 */
export const SHELL_DATABASE_URL = process.env.DATABASE_URL;

process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.SALT ??= '4';

// Tests drop the database between suites and seed legacy data that current
// schemas would reject (duplicate tax-type values), so indexes are only ever
// created on purpose — by the migration under test.
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
