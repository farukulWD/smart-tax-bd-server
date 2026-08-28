export interface IDashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  ordersInProgress: number;
  totalTaxTypes: number;
  totalFiles: number;
  /** Cash actually received — sum of completed payments. */
  totalCollected: number;
  /** Coupon-adjusted fee income on settled orders (the business's own revenue). */
  feeRevenue: number;
  /** Unpaid balance across orders that can still be collected on. */
  totalOutstanding: number;
}

export interface ITimePoint {
  date: string;
  count: number;
}

export interface IRevenuePoint {
  date: string;
  collected: number;
  outstanding: number;
}

export interface ICategoryPoint {
  label: string;
  count: number;
}

export interface IStatusPoint {
  status: string;
  count: number;
}

export interface IDashboardCharts {
  range: string;
  ordersOverTime: ITimePoint[];
  usersOverTime: ITimePoint[];
  revenueOverTime: IRevenuePoint[];
  statusBreakdown: IStatusPoint[];
  incomeSourceMix: ICategoryPoint[];
  taxTypeMix: ICategoryPoint[];
}
