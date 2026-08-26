import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Tax } from '../Tax/tax.model';
import { assertFileNamesExist } from '../fileNames/fileName.service';
import { IIncomeSource } from './incomeSource.interface';
import { IncomeSourceModel } from './incomeSource.model';

const getPublicIncomeSourcesFromDB = async () => {
  const result = await IncomeSourceModel.find({ isActive: true })
    .sort({ order: 1 })
    .populate('required_files');
  return result;
};

const getAllIncomeSourcesAdminFromDB = async () => {
  const result = await IncomeSourceModel.find()
    .sort({ order: 1 })
    .populate('required_files');
  return result;
};

const createIncomeSourceToDB = async (payload: Partial<IIncomeSource>) => {
  const duplicate = await IncomeSourceModel.findOne({ value: payload.value });
  if (duplicate) {
    throw new AppError(
      httpStatus.CONFLICT,
      `An income source "${payload.value}" already exists`,
    );
  }

  await assertFileNamesExist(payload.required_files);

  if (payload.order === undefined) {
    const last = await IncomeSourceModel.findOne().sort({ order: -1 });
    payload.order = last ? last.order + 1 : 0;
  }

  const created = await IncomeSourceModel.create(payload);
  const result = await IncomeSourceModel.findById(created._id).populate(
    'required_files',
  );
  return result;
};

const updateIncomeSourceInDB = async (
  id: string,
  payload: Partial<IIncomeSource>,
) => {
  const isExist = await IncomeSourceModel.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Income source not found');
  }

  if (payload.value && payload.value !== isExist.value) {
    const duplicate = await IncomeSourceModel.findOne({
      value: payload.value,
      _id: { $ne: id },
    });
    if (duplicate) {
      throw new AppError(
        httpStatus.CONFLICT,
        `An income source "${payload.value}" already exists`,
      );
    }
  }

  await assertFileNamesExist(payload.required_files);

  const result = await IncomeSourceModel.findByIdAndUpdate(id, payload, {
    new: true,
  }).populate('required_files');
  return result;
};

const reorderIncomeSourcesInDB = async (
  items: { id: string; order: number }[],
) => {
  await IncomeSourceModel.bulkWrite(
    items.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { order: item.order },
      },
    })),
  );

  const result = await IncomeSourceModel.find()
    .sort({ order: 1 })
    .populate('required_files');
  return result;
};

const deleteIncomeSourceFromDB = async (id: string) => {
  const isExist = await IncomeSourceModel.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Income source not found');
  }

  // Orders store the `value` string, so deleting a source that is still in use
  // would leave those orders pointing at nothing. Deactivate instead.
  const usedBy = await Tax.countDocuments({
    source_of_income: isExist.value,
  });

  if (usedBy) {
    throw new AppError(
      httpStatus.CONFLICT,
      `This income source is used by ${usedBy} tax order(s). Deactivate it instead of deleting.`,
    );
  }

  const result = await IncomeSourceModel.findByIdAndDelete(id);
  return result;
};

export const IncomeSourceService = {
  getPublicIncomeSourcesFromDB,
  getAllIncomeSourcesAdminFromDB,
  createIncomeSourceToDB,
  updateIncomeSourceInDB,
  reorderIncomeSourcesInDB,
  deleteIncomeSourceFromDB,
};
