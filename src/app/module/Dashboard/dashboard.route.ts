import { Router } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';
import { DashboardController } from './dashboard.controller';

const router = Router();

// Admin — headline counters and money totals
router.get(
  '/stats',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  DashboardController.getStats,
);

// Admin — every chart series for one range (7d | 30d | 12m)
router.get(
  '/charts',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  DashboardController.getCharts,
);

export const DashboardRoutes = router;
