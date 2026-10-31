import '../../../test/env';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import mongoose from 'mongoose';
import {
  connectTestDatabase,
  resetTestDatabase,
  startTestServer,
  TApiClient,
} from '../../../test/setup';
import {
  FIXTURE_PASSWORD,
  FIXTURE_USERS,
  seedCatalog,
  seedUsers,
} from '../../../test/fixtures';
import { DEFAULT_SERVICE_FEE } from './settings.constant';

const stepOne = {
  personal_information: {
    name: FIXTURE_USERS.user.name,
    phone: FIXTURE_USERS.user.mobile,
    are_you_student: false,
    are_you_house_wife: false,
  },
  tax_year: '2026-2027',
  tax_types: ['brac'],
};

describe('admin-configured service fee', () => {
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

  it('#1 returns the default fee before any admin change', async () => {
    const res = await api('GET', '/settings');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body?.data?.service_fee, DEFAULT_SERVICE_FEE);
  });

  it('#2 rejects fee changes from non-admins', async () => {
    const res = await api('PATCH', '/settings', {
      token: userToken,
      body: { service_fee: 1 },
    });
    assert.notEqual(res.status, 200, JSON.stringify(res.body));
  });

  it('#3 rejects a negative fee', async () => {
    const res = await api('PATCH', '/settings', {
      token: adminToken,
      body: { service_fee: -5 },
    });
    assert.equal(res.status, 400, JSON.stringify(res.body));
  });

  it('#4 new orders use the updated fee; existing orders keep theirs', async () => {
    const before = await api('POST', '/tax-orders/step-1', {
      token: userToken,
      body: stepOne,
    });
    assert.equal(before.status, 201, JSON.stringify(before.body));
    const oldOrder = before.body?.data?.tax_order;
    assert.equal(oldOrder.fee_amount, DEFAULT_SERVICE_FEE);

    const update = await api('PATCH', '/settings', {
      token: adminToken,
      body: { service_fee: 1500 },
    });
    assert.equal(update.status, 200, JSON.stringify(update.body));
    assert.equal(update.body?.data?.service_fee, 1500);

    const after = await api('POST', '/tax-orders/step-1', {
      token: userToken,
      body: { ...stepOne, fee_amount: 1 },
    });
    assert.equal(after.status, 201, JSON.stringify(after.body));
    assert.equal(after.body?.data?.tax_order.fee_amount, 1500);
    assert.equal(after.body?.data?.tax_order.total_amount, 1500);

    const stored = await mongoose.connection
      .collection('taxes')
      .findOne({ _id: new mongoose.Types.ObjectId(oldOrder._id) });
    assert.equal(stored?.fee_amount, DEFAULT_SERVICE_FEE);
  });
});
