import httpStatus from 'http-status';
import { Router } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TaxTypeService } from './tax.types.services';

/**
 * LEGACY app ≤ v14 — delete this route, and `normalizeLegacyStepOne` in
 * `Tax/tax.services.ts`, once no installs that old remain.
 *
 * Income sources are gone, but that app still builds its order form from
 * `GET /income-sources`. Active tax types carry every field it reads
 * (`_id`, `value`, `title`, `order`, `isActive`), so it lists tax types under
 * the old heading and submits their values as `source_of_income`.
 */
const router = Router();

router.get(
  '/',
  catchAsync(async (_req, res) => {
    const result = await TaxTypeService.getActiveTaxTypesFromDB();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Income sources fetched successfully',
      data: result,
    });
  }),
);

export const LegacyIncomeSourceRoutes = router;
