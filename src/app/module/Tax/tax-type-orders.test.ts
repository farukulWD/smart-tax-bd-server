import '../../../test/env';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import mongoose, { Types } from 'mongoose';
import {
  connectTestDatabase,
  resetTestDatabase,
  startTestServer,
  TApiClient,
} from '../../../test/setup';
import {
  COMMON_FILE_NAMES,
  FILE_NAMES,
  FIXTURE_PASSWORD,
  FIXTURE_USERS,
  seedCatalog,
  seedUsers,
  TAX_TYPES,
} from '../../../test/fixtures';

const personal_information = {
  name: FIXTURE_USERS.user.name,
  phone: FIXTURE_USERS.user.mobile,
  are_you_student: false,
  are_you_house_wife: false,
};

const stepOne = (fields: Record<string, unknown>) => ({
  personal_information,
  tax_year: '2026-2027',
  ...fields,
});

const storedOrder = (id: string) =>
  mongoose.connection
    .collection('taxes')
    .findOne({ _id: new Types.ObjectId(id) });

const sorted = (values: string[]) => [...values].sort();

describe('tax types replace income sources (post-migration data)', () => {
  let api: TApiClient;
  let close: () => Promise<void>;
  let adminToken: string;
  let userToken: string;

  before(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    const { userId } = await seedUsers();
    await seedCatalog(userId, { legacy: false });

    const server = await startTestServer();
    api = server.api;
    close = server.close;
    adminToken = await server.login(FIXTURE_USERS.admin.mobile, FIXTURE_PASSWORD);
    userToken = await server.login(FIXTURE_USERS.user.mobile, FIXTURE_PASSWORD);
  });

  after(async () => {
    await close?.();
    await mongoose.disconnect();
  });

  const newTaxType = (value: string) => ({
    title: { en: 'Duplicate', bn: 'Duplicate' },
    description: { en: 'Duplicate', bn: 'Duplicate' },
    rate: 100,
    value,
  });

  describe('tax type value is a unique, admin-typed key', () => {
    it('#1 rejects creating a tax type with an existing value', async () => {
      const res = await api('POST', '/tax-types/create-tax-type', {
        token: adminToken,
        body: newTaxType('brac'),
      });
      assert.equal(res.status, 409, JSON.stringify(res.body));
    });

    it('#2 rejects a value that is not lowercase snake_case', async () => {
      const res = await api('POST', '/tax-types/create-tax-type', {
        token: adminToken,
        body: newTaxType('BRAC'),
      });
      assert.equal(res.status, 400, JSON.stringify(res.body));
    });

    it('#3 rejects renaming a tax type onto an existing value', async () => {
      const res = await api(
        'PATCH',
        `/tax-types/update-tax-type/${TAX_TYPES.studentVisa._id}`,
        { token: adminToken, body: { value: 'brac' } },
      );
      assert.equal(res.status, 409, JSON.stringify(res.body));
    });
  });

  describe('step-1 orders by tax type', () => {
    it('#4 creates an order from one tax type with its documents', async () => {
      const res = await api('POST', '/tax-orders/step-1', {
        token: userToken,
        body: stepOne({ tax_types: ['brac'] }),
      });
      assert.equal(res.status, 201, JSON.stringify(res.body));

      const { tax_order, required_documents } = res.body?.data;
      assert.deepEqual(tax_order.tax_types, ['brac']);
      assert.deepEqual(
        sorted(required_documents),
        sorted([...COMMON_FILE_NAMES, FILE_NAMES.brac.name]),
      );

      const stored = await storedOrder(tax_order._id);
      assert.ok(stored);
      assert.equal('source_of_income' in stored, false);
    });

    it('#5 unions the documents of several tax types', async () => {
      const res = await api('POST', '/tax-orders/step-1', {
        token: userToken,
        body: stepOne({ tax_types: ['brac', 'business_tax'] }),
      });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.deepEqual(
        sorted(res.body?.data.required_documents),
        sorted([
          ...COMMON_FILE_NAMES,
          FILE_NAMES.brac.name,
          FILE_NAMES.trade.name,
        ]),
      );
    });

    it('#6 requires at least one tax type', async () => {
      const res = await api('POST', '/tax-orders/step-1', {
        token: userToken,
        body: stepOne({ tax_types: [] }),
      });
      assert.equal(res.status, 400, JSON.stringify(res.body));
    });

    it('#7 rejects an unknown tax type', async () => {
      const res = await api('POST', '/tax-orders/step-1', {
        token: userToken,
        body: stepOne({ tax_types: ['nope'] }),
      });
      assert.equal(res.status, 400, JSON.stringify(res.body));
      assert.equal(res.body?.message, 'Unknown tax type: nope');
    });

    it('#8 rejects an inactive tax type', async () => {
      const res = await api('POST', '/tax-orders/step-1', {
        token: userToken,
        body: stepOne({ tax_types: ['vat'] }),
      });
      assert.equal(res.status, 400, JSON.stringify(res.body));
    });
  });

  describe('legacy app (≤ v14) shim', () => {
    it('#9 turns source_of_income into tax_types on create', async () => {
      const res = await api('POST', '/tax-orders/step-1', {
        token: userToken,
        body: stepOne({ source_of_income: ['brac'] }),
      });
      assert.equal(res.status, 201, JSON.stringify(res.body));

      const stored = await storedOrder(res.body?.data.tax_order._id);
      assert.ok(stored);
      assert.deepEqual(stored.tax_types, ['brac']);
      assert.equal('source_of_income' in stored, false);
    });

    it('#10 merges source_of_income into tax_types without duplicates', async () => {
      const res = await api('POST', '/tax-orders/step-1', {
        token: userToken,
        body: stepOne({
          tax_types: ['income_tax'],
          source_of_income: ['brac', 'income_tax'],
        }),
      });
      assert.equal(res.status, 201, JSON.stringify(res.body));

      const stored = await storedOrder(res.body?.data.tax_order._id);
      assert.deepEqual(stored?.tax_types, ['income_tax', 'brac']);
    });

    it('#11 turns source_of_income into tax_types on update', async () => {
      const created = await api('POST', '/tax-orders/step-1', {
        token: userToken,
        body: stepOne({ tax_types: ['brac'] }),
      });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const orderId = created.body?.data.tax_order._id;

      const res = await api('PATCH', `/tax-orders/${orderId}/step-1`, {
        token: userToken,
        body: stepOne({ source_of_income: ['business_tax'] }),
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));

      const stored = await storedOrder(orderId);
      assert.deepEqual(stored?.tax_types, ['business_tax']);
      assert.equal(stored && 'source_of_income' in stored, false);
    });

    it('#12 serves active tax types in the shape the old app reads as income sources', async () => {
      const res = await api('GET', '/income-sources');
      assert.equal(res.status, 200, JSON.stringify(res.body));

      const rows = res.body?.data as Array<Record<string, unknown>>;
      const expected = Object.values(TAX_TYPES).filter(t => t.isActive);
      assert.deepEqual(
        rows.map(row => row.value),
        expected.map(t => t.value),
      );

      for (const row of rows) {
        assert.equal(typeof row._id, 'string');
        assert.equal(typeof row.value, 'string');
        assert.equal(typeof (row.title as { en: string }).en, 'string');
        assert.equal(typeof (row.title as { bn: string }).bn, 'string');
        assert.equal(typeof row.order, 'number');
        assert.equal(row.isActive, true);
      }
    });
  });

  describe('income sources are gone elsewhere', () => {
    it('#13 dashboard charts only chart tax types, told apart by title', async () => {
      const res = await api('GET', '/dashboard/charts', { token: adminToken });
      assert.equal(res.status, 200, JSON.stringify(res.body));

      const data = res.body?.data;
      assert.equal('incomeSourceMix' in data, false);
      const labels = (data.taxTypeMix as Array<{ label: string }>).map(
        point => point.label,
      );
      assert.ok(labels.includes('BRAC'), labels.join(', '));
      assert.ok(labels.includes('Tax Return for Student Visa'), labels.join(', '));
    });

    it('#14 refuses to delete a file name a tax type still requires', async () => {
      const res = await api('DELETE', `/file-names/admin/${FILE_NAMES.brac._id}`, {
        token: adminToken,
      });
      assert.equal(res.status, 409, JSON.stringify(res.body));
      assert.match(res.body?.message ?? '', /BRAC/);
    });

    it('#15 no longer exposes income source admin endpoints', async () => {
      const res = await api('GET', '/income-sources/admin', { token: adminToken });
      assert.equal(res.status, 404, JSON.stringify(res.body));
    });
  });
});
