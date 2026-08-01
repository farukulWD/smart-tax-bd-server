import AppError from '../../errors/AppError';
import { Taxtypes } from './tax.types.interface';
import httpStatus from 'http-status';
import taxTypesModel from './tax.types.model';
import { sendImageToCloudinary } from '../../utils/sendImageToCloudinary';

const uploadIcon = async (file: Express.Multer.File) => {
  const uploadResult = await sendImageToCloudinary(
    `tax-type-icon-${Date.now()}`,
    file.path,
    file.mimetype,
  );
  return uploadResult.secure_url as string;
};

const createTaxTypeToDB = async (
  taxType: Taxtypes,
  file?: Express.Multer.File,
) => {
  if (!taxType.title?.en || !taxType.title?.bn) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Tax type title is required in both English and Bangla',
    );
  }

  if (!taxType.description?.en || !taxType.description?.bn) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Tax type description is required in both English and Bangla',
    );
  }

  if (!taxType.rate) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax type rate is required');
  }

  if (!taxType.value) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax type value is required');
  }

  if (file) {
    taxType.icon = await uploadIcon(file);
  }

  const result = await taxTypesModel.create(taxType);
  return result;
};

const getAllTaxTypesFromDB = async () => {
  const result = await taxTypesModel.find({});
  return result;
};

const updateTaxTypeInDB = async (
  id: string,
  taxType: Taxtypes,
  file?: Express.Multer.File,
) => {
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax type id is required');
  }

  const isExist = await taxTypesModel.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax type not found');
  }

  if (file) {
    taxType.icon = await uploadIcon(file);
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
