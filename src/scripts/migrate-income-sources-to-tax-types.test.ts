import '../test/env';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose, { Types } from 'mongoose';
import { connectTestDatabase, resetTestDatabase } from '../test/setup';
import {
  MIXED_ORDER,
  ORDERS,
  seedCatalog,
  seedUnmappedOrder,
  seedUsers,
  TAX_TYPES,
} from '../test/fixtures';
import {
  runMigration,
  verifyMigration,
} from './migrate-income-sources-to-tax-types';

const db = () => mongoose.connection.db!;

const collectionExists = async (name: string) =>
  (await db().listCollections({ name }).toArray()).length > 0;

const snapshot = async () => {
  const read = async (name: string) =>
    (await collectionExists(name))
      ? db().collection(name).find().sort({ _id: 1 }).toArray()
      : null;

  return {
    taxtypes: await read('taxtypes'),
    taxes: await read('taxes'),
    incomesources: await read('incomesources'),
    taxTypeIndexes: (await collectionExists('taxtypes'))
      ? await db().collection('taxtypes').indexes()
      : [],
  };
};

const taxTypeValue = async (id: Types.ObjectId) =>
  (await db().collection('taxtypes').findOne({ _id: id }))?.value;

describe('migrate-income-sources-to-tax-types', () => {
  let userId: Types.ObjectId;

  before(async () => {
    await connectTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    ({ userId } = await seedUsers());
    await seedCatalog(userId, { legacy: true });
  });

  after(async () => {
    await mongoose.disconnect();
  });

  it('dry run reports the plan and changes nothing', async () => {
    const before = await snapshot();
    const report = await runMigration({ apply: false });
    assert.deepEqual(await snapshot(), before);

    assert.equal(report.status, 'dry-run');
    assert.deepEqual(
      report.renames.map(({ id, from, to }) => ({ id, from, to })),
      [{ id: String(TAX_TYPES.brac._id), from: 'income_tax', to: 'brac' }],
    );
    assert.equal(report.sourceCounts['BRAC'], 2);
    assert.equal(report.sourceCounts['Income from Private Job'], 2);
    assert.equal(report.sourceCounts['Income from Govt.Job'], 1);
    assert.equal(report.ordersToUpdate, ORDERS.length);
    assert.deepEqual(report.unmappedSources, []);
    assert.deepEqual(report.missingTargets, []);
  });

  it('refuses to apply while any source has no mapping, changing nothing', async () => {
    await seedUnmappedOrder(userId);
    const before = await snapshot();

    const report = await runMigration({ apply: true });

    assert.equal(report.status, 'blocked');
    assert.deepEqual(report.unmappedSources, [
      { value: 'Income from others Source', orders: 1 },
    ]);
    assert.deepEqual(await snapshot(), before);
  });

  it('applies: unique values, orders moved to tax_types, income sources dropped', async () => {
    const report = await runMigration({ apply: true });
    assert.equal(report.status, 'applied');

    assert.equal(await taxTypeValue(TAX_TYPES.studentVisa._id), 'income_tax');
    assert.equal(await taxTypeValue(TAX_TYPES.brac._id), 'brac');

    const valueIndex = (await db().collection('taxtypes').indexes()).find(
      index => JSON.stringify(index.key) === JSON.stringify({ value: 1 }),
    );
    assert.equal(valueIndex?.unique, true);

    const orders = await db().collection('taxes').find().toArray();
    assert.equal(orders.length, ORDERS.length);
    for (const expected of ORDERS) {
      const order = orders.find(o => String(o._id) === String(expected._id));
      assert.ok(order, `order ${expected._id} missing`);
      assert.equal('source_of_income' in order, false);
      assert.deepEqual(order.tax_types, expected.migratedTaxTypes);
    }
    assert.deepEqual(
      orders.find(o => String(o._id) === String(MIXED_ORDER._id))?.tax_types,
      ['income_tax', 'brac', 'income_tax_non_government'],
    );

    assert.equal(await collectionExists('incomesources'), false);
    assert.deepEqual(report.changes, {
      taxTypesRenamed: 1,
      ordersUpdated: ORDERS.length,
      incomeSourcesDropped: true,
    });
  });

  it('verify passes after apply', async () => {
    await runMigration({ apply: true });
    const { problems } = await verifyMigration();
    assert.deepEqual(problems, []);
  });

  it('a second apply is a no-op', async () => {
    await runMigration({ apply: true });
    const before = await snapshot();

    const report = await runMigration({ apply: true });

    assert.equal(report.status, 'applied');
    assert.deepEqual(report.changes, {
      taxTypesRenamed: 0,
      ordersUpdated: 0,
      incomeSourcesDropped: false,
    });
    assert.deepEqual(await snapshot(), before);
  });

  it('verify flags unmigrated data', async () => {
    const { problems } = await verifyMigration();
    const text = problems.join('\n');

    assert.match(text, /duplicate tax type value "income_tax"/);
    assert.match(text, /unique index/);
    assert.match(text, /source_of_income/);
    assert.match(text, /incomesources/);
  });
});
