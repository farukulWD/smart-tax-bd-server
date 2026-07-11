import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { IHowItWork, IHowItWorkSection } from './howItWork.interface';
import { HowItWork, HowItWorkSection } from './howItWork.model';

const getPublicHowItWorksFromDB = async () => {
  const result = await HowItWork.find({ isActive: true }).sort({ order: 1 });
  return result;
};

const getAllHowItWorksAdminFromDB = async () => {
  const result = await HowItWork.find().sort({ order: 1 });
  return result;
};

const createHowItWorkToDB = async (payload: Partial<IHowItWork>) => {
  if (payload.order === undefined) {
    const last = await HowItWork.findOne().sort({ order: -1 });
    payload.order = last ? last.order + 1 : 0;
  }

  const result = await HowItWork.create(payload);
  return result;
};

const updateHowItWorkInDB = async (
  id: string,
  payload: Partial<IHowItWork>,
) => {
  const isExist = await HowItWork.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'How It Work step not found');
  }

  const result = await HowItWork.findByIdAndUpdate(id, payload, {
    new: true,
  });
  return result;
};

const reorderHowItWorksInDB = async (
  items: { id: string; order: number }[],
) => {
  await HowItWork.bulkWrite(
    items.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { order: item.order },
      },
    })),
  );

  const result = await HowItWork.find().sort({ order: 1 });
  return result;
};

const deleteHowItWorkFromDB = async (id: string) => {
  const isExist = await HowItWork.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'How It Work step not found');
  }
  const result = await HowItWork.findByIdAndDelete(id);
  return result;
};

const getHowItWorkSectionFromDB = async () => {
  const result = await HowItWorkSection.findOne();
  return result;
};

const upsertHowItWorkSectionInDB = async (
  payload: Partial<IHowItWorkSection>,
) => {
  const result = await HowItWorkSection.findOneAndUpdate({}, payload, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
  return result;
};

export const HowItWorkService = {
  getPublicHowItWorksFromDB,
  getAllHowItWorksAdminFromDB,
  createHowItWorkToDB,
  updateHowItWorkInDB,
  reorderHowItWorksInDB,
  deleteHowItWorkFromDB,
  getHowItWorkSectionFromDB,
  upsertHowItWorkSectionInDB,
};
