import { Router } from 'express';
import { UserRoutes } from '../module/users/user.route';
import { AuthRoutes } from '../module/Auth/auth.route';
import { TaxRoutes } from '../module/Tax/tax.route';
import { TaxTypesRoute } from '../module/taxTypes/tax.types.route';
import { FileRoute } from '../module/files/file.route';
import { paymentRoutes } from '../module/payments/payment.route';
import { UpdateNewsRoute } from '../module/updateNews/updateNews.route';
import { notificationRoutes } from '../module/notifications/notification.route';
import { BlogRoutes } from '../module/blog/blog.route';
import { ReviewRoutes } from '../module/review/review.route';
import { FaqRoutes } from '../module/faq/faq.route';
import { HowItWorkRoutes } from '../module/howItWork/howItWork.route';
import { FileNameRoutes } from '../module/fileNames/fileName.route';
import { IncomeSourceRoutes } from '../module/incomeSources/incomeSource.route';
import { CouponRoutes } from '../module/coupons/coupon.route';
import { DashboardRoutes } from '../module/Dashboard/dashboard.route';

const router = Router();

const moduleRoutes = [
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/tax-orders',
    route: TaxRoutes,
  },
  {
    path: '/tax-types',
    route: TaxTypesRoute,
  },
  {
    path: '/files',
    route: FileRoute,
  },
  {
    path: '/payments',
    route: paymentRoutes,
  },
  {
    path: '/update-news',
    route: UpdateNewsRoute,
  },
  {
    path: '/notifications',
    route: notificationRoutes,
  },
  {
    path: '/blogs',
    route: BlogRoutes,
  },
  {
    path: '/reviews',
    route: ReviewRoutes,
  },
  {
    path: '/faqs',
    route: FaqRoutes,
  },
  {
    path: '/how-it-works',
    route: HowItWorkRoutes,
  },
  {
    path: '/file-names',
    route: FileNameRoutes,
  },
  {
    path: '/income-sources',
    route: IncomeSourceRoutes,
  },
  {
    path: '/coupons',
    route: CouponRoutes,
  },
  {
    path: '/dashboard',
    route: DashboardRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
