import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TaxTypeService } from './tax.types.services';
import httpStatus from 'http-status';

const createTaxType = catchAsync(async (req, res) => {
  const result = await TaxTypeService.createTaxTypeToDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tax type created successfully',
    data: result,
  });
});

const getAllTaxTypes = catchAsync(async (req, res) => {
  const result = await TaxTypeService.getAllTaxTypesFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tax types fetched successfully',
    data: result,
  });
});

const updateTaxType = catchAsync(async (req, res) => {
  const result = await TaxTypeService.updateTaxTypeInDB(
    req.params.id,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tax type updated successfully',
    data: result,
  });
});

const deleteTaxType = catchAsync(async (req, res) => {
  const result = await TaxTypeService.deleteTaxTypeFromDB(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tax type deleted successfully',
    data: result,
  });
});

export const TaxTypeController = {
  createTaxType,
  getAllTaxTypes,
  updateTaxType,
  deleteTaxType,
};
