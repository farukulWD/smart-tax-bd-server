import AppError from '../../errors/AppError';
import { Taxtypes } from './tax.types.interface';
import httpStatus from 'http-status';
import taxTypesModel from './tax.types.model';
import { sendImageToCloudinary } from '../../utils/sendImageToCloudinary';
import { assertFileNamesExist } from '../fileNames/fileName.service';

const uploadIcon = async (file: Express.Multer.File) => {
  const uploadResult = await sendImageToCloudinary(
    `tax-type-icon-${Date.now()}`,
    file.path,
    file.mimetype,
  );
  return uploadResult.secure_url as string;
};

// Orders store the value, so two rows sharing one cannot be told apart.
const assertValueIsFree = async (value: string, exceptId?: string) => {
  const duplicate = await taxTypesModel.findOne({
    value,
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  });
  if (duplicate) {
    throw new AppError(
      httpStatus.CONFLICT,
      `A tax type "${value}" already exists`,
    );
  }
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

  await assertValueIsFree(taxType.value);
  await assertFileNamesExist(taxType.required_files);

  if (file) {
    taxType.icon = await uploadIcon(file);
  }

  if (taxType.order === undefined) {
    const last = await taxTypesModel.findOne().sort({ order: -1 });
    taxType.order = last ? last.order + 1 : 0;
  }

  const result = await taxTypesModel.create(taxType);
  return result;
};

// `createdAt` breaks ties for rows created before `order` existed, so they
// keep a stable position until an admin reorders them.
const getAllTaxTypesFromDB = async () => {
  const result = await taxTypesModel
    .find({})
    .sort({ order: 1, createdAt: 1 })
    .populate('required_files');
  return result;
};

const getActiveTaxTypesFromDB = async () => {
  const result = await taxTypesModel
    .find({ isActive: true })
    .sort({ order: 1, createdAt: 1 });
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

  if (taxType.value && taxType.value !== isExist.value) {
    await assertValueIsFree(taxType.value, id);
  }

  await assertFileNamesExist(taxType.required_files);

  if (file) {
    taxType.icon = await uploadIcon(file);
  }

  const result = await taxTypesModel
    .findByIdAndUpdate(id, taxType, {
      new: true,
    })
    .populate('required_files');
  return result;
};

const reorderTaxTypesInDB = async (items: { id: string; order: number }[]) => {
  await taxTypesModel.bulkWrite(
    items.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { order: item.order },
      },
    })),
  );

  const result = await taxTypesModel
    .find({})
    .sort({ order: 1, createdAt: 1 })
    .populate('required_files');
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
  getActiveTaxTypesFromDB,
  updateTaxTypeInDB,
  reorderTaxTypesInDB,
  deleteTaxTypeFromDB,
};
