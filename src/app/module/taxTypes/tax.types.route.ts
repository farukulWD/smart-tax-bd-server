import { Router } from 'express';
import { TaxTypeController } from './tax.types.controller';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';

const route = Router();

route.post(
  '/create-tax-type',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  TaxTypeController.createTaxType,
);
route.get(
  '/get-all-tax-types',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user),
  TaxTypeController.getAllTaxTypes,
);
route.patch(
  '/update-tax-type/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  TaxTypeController.updateTaxType,
);
route.delete(
  '/delete-tax-type/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  TaxTypeController.deleteTaxType,
);

export const TaxTypesRoute = route;
