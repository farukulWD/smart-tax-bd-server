import { Router } from 'express';
import { UserRoutes } from '../module/users/user.route';
import { AuthRoutes } from '../module/Auth/auth.route';
import { TaxRoutes } from '../module/Tax/tax.route';
import { TaxTypesRoute } from '../module/taxTypes/tax.types.route';
import { FileRoute } from '../module/files/file.route';

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
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
