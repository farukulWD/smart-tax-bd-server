/**
 * Bangladesh has a single fixed offset (UTC+06:00) and no DST, which is why the
 * bucket helpers can shift by a constant instead of pulling in a tz library.
 * Grouping in UTC would push evening activity onto the following day.
 */
export const DASHBOARD_TIMEZONE = 'Asia/Dhaka';
export const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

export const DASHBOARD_RANGES = ['7d', '30d', '12m'] as const;
export type TDashboardRange = (typeof DASHBOARD_RANGES)[number];
export const DEFAULT_DASHBOARD_RANGE: TDashboardRange = '30d';

/**
 * Orders that are live work for an admin. Replaces the old dashboard's
 * `status === 'pending'` check, which never matched anything — `pending` is not
 * a member of TaxStatus.
 */
export const IN_PROGRESS_STATUSES = [
  'submitted',
  'in_progress',
  'order_placed',
  'payment_pending',
  'documents_uploaded',
] as const;

/**
 * Excluded from money totals: these orders will never be collected on.
 * `draft` is in the list because a nightly cron deletes every draft at 00:00
 * Asia/Dhaka, so counting them makes totals shrink for reasons unrelated to
 * business volume.
 */
export const NON_BILLABLE_STATUSES = [
  'draft',
  'cancelled',
  'deleted',
  'archived',
] as const;

/** Drafts are transient (see above), so they are noise in a breakdown. */
export const BREAKDOWN_EXCLUDED_STATUSES = ['draft'] as const;

/** How many bars the category-mix charts show before the tail is dropped. */
export const MIX_LIMIT = 10;
