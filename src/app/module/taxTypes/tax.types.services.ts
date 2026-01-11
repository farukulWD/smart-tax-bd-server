import AppError from '../../errors/AppError';
import { Taxtypes } from './tax.types.interface';
import httpStatus from 'http-status';
import taxTypesModel from './tax.types.model';

const createTaxTypeToDB = async (taxType: Taxtypes) => {
  if (!taxType.name) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax type name is required');
  }

  if (!taxType.rate) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax type rate is required');
  }

  if (!taxType.type) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax type type is required');
  }

  const isExist = await taxTypesModel.findOne({ type: taxType.type });
  if (isExist) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax type already exists');
  }

  const result = await taxTypesModel.create(taxType);
  return result;
};

const getAllTaxTypesFromDB = async () => {
  const result = await taxTypesModel.find({});
  return result;
};

const updateTaxTypeInDB = async (id: string, taxType: Taxtypes) => {
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax type id is required');
  }

  const isExist = await taxTypesModel.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax type not found');
  }

  const result = await taxTypesModel.findByIdAndUpdate(id, taxType, {
    new: true,
  });
  return result;
};

const deleteTaxTypeFromDB = async (id: string) => {
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax type id is required');
  }

  const isExist = await taxTypesModel.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax type not found');
  }

  const result = await taxTypesModel.findByIdAndDelete(id);
  return result;
};

export const TaxTypeService = {
  createTaxTypeToDB,
  getAllTaxTypesFromDB,
  updateTaxTypeInDB,
  deleteTaxTypeFromDB,
};
