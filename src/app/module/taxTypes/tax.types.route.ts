import { NextFunction, Request, Response, Router } from 'express';
import { TaxTypeController } from './tax.types.controller';
import auth from '../../middlewares/auth';
import { USER_ROLE } from '../users/user.constant';
import validateRequest from '../../middlewares/validateRequest';
import { upload } from '../../utils/sendImageToCloudinary';
import { TaxTypeValidation } from './tax.types.validation';

const route = Router();

const parseFormData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.data) {
    req.body = JSON.parse(req.body.data);
  }
  next();
};

route.post(
  '/create-tax-type',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  upload.single('icon'),
  parseFormData,
  validateRequest(TaxTypeValidation.createTaxTypeValidationSchema),
  TaxTypeController.createTaxType,
);
route.get(
  '/get-all-tax-types',
  // auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user),
  TaxTypeController.getAllTaxTypes,
);
route.patch(
  '/update-tax-type/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  upload.single('icon'),
  parseFormData,
  validateRequest(TaxTypeValidation.updateTaxTypeValidationSchema),
  TaxTypeController.updateTaxType,
);
route.delete(
  '/delete-tax-type/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  TaxTypeController.deleteTaxType,
);

export const TaxTypesRoute = route;
