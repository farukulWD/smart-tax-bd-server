import { Router } from 'express';
import { UserRoutes } from '../module/users/user.route';
import { AuthRoutes } from '../module/Auth/auth.route';
import { TaxRoutes } from '../module/Tax/tax.route';

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
    path: '/tax',
    route: TaxRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
