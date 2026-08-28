import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import taxTypesModel from '../taxTypes/tax.types.model';
import { IncomeSourceModel } from '../incomeSources/incomeSource.model';
import { IFileName } from './fileName.interface';
import { FileName } from './fileName.model';

/**
 * Guards against a tax type or income source pointing at a file name that does
 * not exist — the bad id would silently vanish from `required_documents` at
 * order time instead of failing here where the admin can see it.
 */
export const assertFileNamesExist = async (
  ids?: Types.ObjectId[] | string[],
) => {
  if (!ids?.length) return;

  const invalid = (ids as string[]).filter(id => !Types.ObjectId.isValid(id));
  if (invalid.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid file name id: ${invalid.join(', ')}`,
    );
  }

  const found = await FileName.countDocuments({ _id: { $in: ids } });
  if (found !== new Set(ids as string[]).size) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'One or more selected file names no longer exist',
    );
  }
};

const getPublicFileNamesFromDB = async () => {
  const result = await FileName.find({ isActive: true }).sort({ order: 1 });
  return result;
};

const getAllFileNamesAdminFromDB = async () => {
  const result = await FileName.find().sort({ order: 1 });
  return result;
};

const createFileNameToDB = async (payload: Partial<IFileName>) => {
  const duplicate = await FileName.findOne({ name: payload.name });
  if (duplicate) {
    throw new AppError(
      httpStatus.CONFLICT,
      `A file name "${payload.name}" already exists`,
    );
  }

  if (payload.order === undefined) {
    const last = await FileName.findOne().sort({ order: -1 });
    payload.order = last ? last.order + 1 : 0;
  }

  const result = await FileName.create(payload);
  return result;
};

const updateFileNameInDB = async (id: string, payload: Partial<IFileName>) => {
  const isExist = await FileName.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'File name not found');
  }

  if (payload.name && payload.name !== isExist.name) {
    const duplicate = await FileName.findOne({
      name: payload.name,
      _id: { $ne: id },
    });
    if (duplicate) {
      throw new AppError(
        httpStatus.CONFLICT,
        `A file name "${payload.name}" already exists`,
      );
    }
  }

  const result = await FileName.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const reorderFileNamesInDB = async (items: { id: string; order: number }[]) => {
  await FileName.bulkWrite(
    items.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { order: item.order },
      },
    })),
  );

  const result = await FileName.find().sort({ order: 1 });
  return result;
};

const deleteFileNameFromDB = async (id: string) => {
  const isExist = await FileName.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'File name not found');
  }

  // A tax type or income source still asking for this document would silently
  // lose a required upload slot, so make the admin detach it first.
  const [taxTypes, incomeSources] = await Promise.all([
    taxTypesModel.find({ required_files: id }).select('title value'),
    IncomeSourceModel.find({ required_files: id }).select('title value'),
  ]);

  const referencedBy = [
    ...taxTypes.map(taxType => taxType.title?.en || taxType.value),
    ...incomeSources.map(source => source.title?.en || source.value),
  ];

  if (referencedBy.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      `This file name is still required by: ${referencedBy.join(
        ', ',
      )}. Remove it from those first.`,
    );
  }

  const result = await FileName.findByIdAndDelete(id);
  return result;
};

export const FileNameService = {
  getPublicFileNamesFromDB,
  getAllFileNamesAdminFromDB,
  createFileNameToDB,
  updateFileNameInDB,
  reorderFileNamesInDB,
  deleteFileNameFromDB,
};
