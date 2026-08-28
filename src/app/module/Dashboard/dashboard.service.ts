import { Tax } from '../Tax/tax.model';
import { User } from '../users/user.model';
import { Payment } from '../payments/payment.model';
import Taxtype from '../taxTypes/tax.types.model';
import { Files } from '../files/files.model';
import {
  BREAKDOWN_EXCLUDED_STATUSES,
  DASHBOARD_RANGES,
  DASHBOARD_TIMEZONE,
  DEFAULT_DASHBOARD_RANGE,
  DHAKA_OFFSET_MS,
  IN_PROGRESS_STATUSES,
  MIX_LIMIT,
  NON_BILLABLE_STATUSES,
  TDashboardRange,
} from './dashboard.constant';
import {
  ICategoryPoint,
  IDashboardCharts,
  IDashboardStats,
  IRevenuePoint,
  IStatusPoint,
  ITimePoint,
} from './dashboard.interface';

/**
 * The codebase's definition of a redeemed order, lifted verbatim from
 * `coupon.service.getUsageByCouponIds` so the dashboard and the coupon usage
 * report can never disagree about what "paid" means.
 */
const IS_SETTLED = {
  $or: [
    { $eq: ['$is_fee_amount_paid', true] },
    { $in: ['$status', ['order_placed', 'completed']] },
  ],
};

/**
 * Mirrors `tax.utils.getPayableFeeAmount` in aggregation form. Summing raw
 * `fee_amount` would overstate revenue by the discount on every couponed order.
 */
const PAYABLE_FEE = {
  $max: [
    0,
    {
      $subtract: [
        { $ifNull: ['$fee_amount', 0] },
        { $ifNull: ['$applied_coupon.discount_amount', 0] },
      ],
    },
  ],
};

const OUTSTANDING = {
  $max: [
    0,
    {
      $subtract: [
        { $ifNull: ['$total_amount', 0] },
        { $ifNull: ['$total_paid_amount', 0] },
      ],
    },
  ],
};

export const normalizeRange = (value: unknown): TDashboardRange =>
  DASHBOARD_RANGES.includes(value as TDashboardRange)
    ? (value as TDashboardRange)
    : DEFAULT_DASHBOARD_RANGE;

type TBuckets = {
  keys: string[];
  start: Date;
  format: string;
};

/**
 * Builds the complete list of bucket keys for a range plus the UTC instant the
 * range starts at. The key list is what lets the response carry empty days —
 * `$group` only emits buckets that have data, and a line chart that silently
 * skips empty days misreports the trend.
 */
const buildBuckets = (range: TDashboardRange): TBuckets => {
  const dhakaNow = new Date(Date.now() + DHAKA_OFFSET_MS);
  const keys: string[] = [];

  if (range === '12m') {
    const year = dhakaNow.getUTCFullYear();
    const month = dhakaNow.getUTCMonth();

    for (let i = 11; i >= 0; i--) {
      keys.push(
        new Date(Date.UTC(year, month - i, 1)).toISOString().slice(0, 7),
      );
    }

    const startOfWindow = Date.UTC(year, month - 11, 1);
    return {
      keys,
      start: new Date(startOfWindow - DHAKA_OFFSET_MS),
      format: '%Y-%m',
    };
  }

  const days = range === '7d' ? 7 : 30;
  const todayStart = Date.UTC(
    dhakaNow.getUTCFullYear(),
    dhakaNow.getUTCMonth(),
    dhakaNow.getUTCDate(),
  );

  for (let i = days - 1; i >= 0; i--) {
    keys.push(new Date(todayStart - i * 86400000).toISOString().slice(0, 10));
  }

  return {
    keys,
    start: new Date(todayStart - (days - 1) * 86400000 - DHAKA_OFFSET_MS),
    format: '%Y-%m-%d',
  };
};

const bucketId = (format: string, dateExpr: string | object) => ({
  $dateToString: {
    format,
    date: dateExpr,
    timezone: DASHBOARD_TIMEZONE,
  },
});

const zeroFillCounts = (
  keys: string[],
  rows: { _id: string; count: number }[],
): ITimePoint[] => {
  const found = new Map(rows.map(row => [row._id, row.count]));
  return keys.map(date => ({ date, count: found.get(date) ?? 0 }));
};

const getStatsFromDB = async (): Promise<IDashboardStats> => {
  const [orderFacet, totalUsers, activeUsers, totalTaxTypes, totalFiles] =
    await Promise.all([
      Tax.aggregate<{
        totals: { totalOrders: number }[];
        inProgress: { count: number }[];
        money: { feeRevenue: number; totalOutstanding: number }[];
      }>([
        {
          $facet: {
            totals: [{ $count: 'totalOrders' }],
            inProgress: [
              { $match: { status: { $in: [...IN_PROGRESS_STATUSES] } } },
              { $count: 'count' },
            ],
            money: [
              { $match: { status: { $nin: [...NON_BILLABLE_STATUSES] } } },
              {
                $group: {
                  _id: null,
                  feeRevenue: {
                    $sum: { $cond: [IS_SETTLED, PAYABLE_FEE, 0] },
                  },
                  totalOutstanding: { $sum: OUTSTANDING },
                },
              },
            ],
          },
        },
      ]),
      User.countDocuments({ isDeleted: { $ne: true } }),
      User.countDocuments({ isDeleted: { $ne: true }, status: 'active' }),
      Taxtype.countDocuments(),
      Files.countDocuments(),
    ]);

  const collectedRows = await Payment.aggregate<{ total: number }>([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
  ]);

  const facet = orderFacet[0];

  return {
    totalUsers,
    activeUsers,
    totalOrders: facet?.totals?.[0]?.totalOrders ?? 0,
    ordersInProgress: facet?.inProgress?.[0]?.count ?? 0,
    totalTaxTypes,
    totalFiles,
    totalCollected: collectedRows[0]?.total ?? 0,
    feeRevenue: facet?.money?.[0]?.feeRevenue ?? 0,
    totalOutstanding: facet?.money?.[0]?.totalOutstanding ?? 0,
  };
};

const getOrdersOverTime = async (buckets: TBuckets): Promise<ITimePoint[]> => {
  const rows = await Tax.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        createdAt: { $gte: buckets.start },
        status: { $nin: [...BREAKDOWN_EXCLUDED_STATUSES] },
      },
    },
    {
      $group: {
        _id: bucketId(buckets.format, '$createdAt'),
        count: { $sum: 1 },
      },
    },
  ]);

  return zeroFillCounts(buckets.keys, rows);
};

const getUsersOverTime = async (buckets: TBuckets): Promise<ITimePoint[]> => {
  const rows = await User.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        createdAt: { $gte: buckets.start },
        role: 'user',
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: bucketId(buckets.format, '$createdAt'),
        count: { $sum: 1 },
      },
    },
  ]);

  return zeroFillCounts(buckets.keys, rows);
};

/**
 * Cash-in comes from payments (bucketed by when the money arrived); the unpaid
 * balance comes from orders (bucketed by when the order was raised). Two
 * sources, one shared axis — both are BDT.
 */
const getRevenueOverTime = async (
  buckets: TBuckets,
): Promise<IRevenuePoint[]> => {
  const [collectedRows, outstandingRows] = await Promise.all([
    Payment.aggregate<{ _id: string; total: number }>([
      { $match: { status: 'completed' } },
      {
        // Payments written before `timestamps: true` have no createdAt; the
        // ObjectId carries the real creation time, so history is preserved.
        $addFields: {
          paidAt: { $ifNull: ['$createdAt', { $toDate: '$_id' }] },
        },
      },
      { $match: { paidAt: { $gte: buckets.start } } },
      {
        $group: {
          _id: bucketId(buckets.format, '$paidAt'),
          total: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },
    ]),
    Tax.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          createdAt: { $gte: buckets.start },
          status: { $nin: [...NON_BILLABLE_STATUSES] },
        },
      },
      {
        $group: {
          _id: bucketId(buckets.format, '$createdAt'),
          total: { $sum: OUTSTANDING },
        },
      },
    ]),
  ]);

  const collected = new Map(collectedRows.map(row => [row._id, row.total]));
  const outstanding = new Map(outstandingRows.map(row => [row._id, row.total]));

  return buckets.keys.map(date => ({
    date,
    collected: collected.get(date) ?? 0,
    outstanding: outstanding.get(date) ?? 0,
  }));
};

const getStatusBreakdown = async (start: Date): Promise<IStatusPoint[]> => {
  const rows = await Tax.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        createdAt: { $gte: start },
        status: { $nin: [...BREAKDOWN_EXCLUDED_STATUSES] },
      },
    },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return rows.map(row => ({ status: row._id, count: row.count }));
};

/**
 * `source_of_income` and `tax_types` hold value keys; the human label lives in
 * a lookup collection. Falls back to the raw key when no lookup row matches, so
 * a value retired from the lookup table still charts instead of vanishing.
 */
const getCategoryMix = async (
  start: Date,
  field: 'source_of_income' | 'tax_types',
  lookupFrom: 'incomesources' | 'taxtypes',
): Promise<ICategoryPoint[]> => {
  const rows = await Tax.aggregate<{ label: string; count: number }>([
    {
      $match: {
        createdAt: { $gte: start },
        status: { $nin: [...BREAKDOWN_EXCLUDED_STATUSES] },
      },
    },
    { $unwind: `$${field}` },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: MIX_LIMIT },
    {
      $lookup: {
        from: lookupFrom,
        localField: '_id',
        foreignField: 'value',
        as: 'meta',
      },
    },
    {
      $project: {
        _id: 0,
        count: 1,
        label: {
          $ifNull: [{ $arrayElemAt: ['$meta.title.en', 0] }, '$_id'],
        },
      },
    },
  ]);

  return rows;
};

const getChartsFromDB = async (
  rangeInput: unknown,
): Promise<IDashboardCharts> => {
  const range = normalizeRange(rangeInput);
  const buckets = buildBuckets(range);

  const [
    ordersOverTime,
    usersOverTime,
    revenueOverTime,
    statusBreakdown,
    incomeSourceMix,
    taxTypeMix,
  ] = await Promise.all([
    getOrdersOverTime(buckets),
    getUsersOverTime(buckets),
    getRevenueOverTime(buckets),
    getStatusBreakdown(buckets.start),
    getCategoryMix(buckets.start, 'source_of_income', 'incomesources'),
    getCategoryMix(buckets.start, 'tax_types', 'taxtypes'),
  ]);

  return {
    range,
    ordersOverTime,
    usersOverTime,
    revenueOverTime,
    statusBreakdown,
    incomeSourceMix,
    taxTypeMix,
  };
};

export const DashboardService = {
  getStatsFromDB,
  getChartsFromDB,
};
