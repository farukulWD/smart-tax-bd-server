import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { IFaq } from './faq.interface';
import { Faq } from './faq.model';

const getPublicFaqsFromDB = async () => {
  const result = await Faq.find({ isActive: true }).sort({ order: 1 });
  return result;
};

const getAllFaqsAdminFromDB = async () => {
  const result = await Faq.find().sort({ order: 1 });
  return result;
};

const createFaqToDB = async (payload: Partial<IFaq>) => {
  if (payload.order === undefined) {
    const last = await Faq.findOne().sort({ order: -1 });
    payload.order = last ? last.order + 1 : 0;
  }

  const result = await Faq.create(payload);
  return result;
};

const updateFaqInDB = async (id: string, payload: Partial<IFaq>) => {
  const isExist = await Faq.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'FAQ not found');
  }

  const result = await Faq.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const reorderFaqsInDB = async (items: { id: string; order: number }[]) => {
  await Faq.bulkWrite(
    items.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { order: item.order },
      },
    })),
  );

  const result = await Faq.find().sort({ order: 1 });
  return result;
};

const deleteFaqFromDB = async (id: string) => {
  const isExist = await Faq.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'FAQ not found');
  }
  const result = await Faq.findByIdAndDelete(id);
  return result;
};

export const FaqService = {
  getPublicFaqsFromDB,
  getAllFaqsAdminFromDB,
  createFaqToDB,
  updateFaqInDB,
  reorderFaqsInDB,
  deleteFaqFromDB,
};
