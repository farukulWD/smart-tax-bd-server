import { NextFunction, Request, Response, Router } from 'express';
import { TaxController } from './tax.controller';
import { upload } from '../../utils/sendImageToCloudinary';

const router = Router();

router.post(
  '/order-tax',
  upload.fields([
    { name: 'etin_file', maxCount: 1 },
    { name: 'salary_statement', maxCount: 1 },
    { name: 'bank_statement', maxCount: 1 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    req.body = JSON.parse(req.body.data);
    next();
  },
  TaxController.createTax
);

export const TaxRoutes = router;
