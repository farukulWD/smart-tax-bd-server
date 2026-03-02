import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { extractText, validateETIN } from '../../utils';
import { sendImageToCloudinary } from '../../utils/sendImageToCloudinary';
import { Tax } from './tax.model';
import taxTypesModel from '../taxTypes/tax.types.model';

const REQUIRED_FILES = ['etin_file', 'salary_statement', 'bank_statement'];

const OPTIONAL_FILES = [
  'gpf_statement',
  'rpf_statement',
  'pf_statement',
  'nps_statement',
  'land_deed',
  'other_document',
  'vechile_buy_recipt',
  'loan_statement',
];

const uploadFilesToCloud = async (
  files: Express.Multer.File[],
  payload: any,
) => {
  for (const field of [...REQUIRED_FILES, ...OPTIONAL_FILES]) {
    const found = files.find(f => f.fieldname === field);

    // validate required
    if (!found && REQUIRED_FILES.includes(field)) {
      throw new AppError(httpStatus.BAD_REQUEST, `${field} is required`);
    }

    if (found) {
      const fileName = found.originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/\s+/g, '_');
      const path = found.path;
      const { secure_url } = await sendImageToCloudinary(
        fileName,
        path,
        found.mimetype,
      );
      payload[field] = secure_url as string;
    }
  }
};

const createForTaxService = async (payload: any) => {
  // const etinFile = files.find(f => f.fieldname === 'etin_file');
  // if (!etinFile) {
  //   throw new AppError(httpStatus.BAD_REQUEST, 'etin_file is required');
  // }

  // const text = await extractText(etinFile);
  // const isValid = validateETIN(text);

  // if (!isValid) {
  //   throw new AppError(
  //     httpStatus.BAD_REQUEST,
  //     'The tin certificate is not valid',
  // );
  // }

  // await uploadFilesToCloud(files, payload);

  if (!payload.mobile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Mobile number is required');
  }

  if (!payload.tax_year) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax year is required');
  }

  if (!Array.isArray(payload.tax_types) || payload.tax_types.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax types are required');
  }

  const selectedTaxTypes = await taxTypesModel.find({
    _id: { $in: payload.tax_types },
  });

  if (selectedTaxTypes.length !== payload.tax_types.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'One or more tax types are invalid',
    );
  }

  const payableAmount = selectedTaxTypes.reduce(
    (sum, taxType) => sum + Number(taxType.rate || 0),
    0,
  );

  if (payableAmount <= 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payable amount could not be calculated from selected tax types',
    );
  }

  const result = await Tax.create({
    ...payload,
    payable_amount: payableAmount,
  });

  await taxTypesModel.updateMany(
    { _id: { $in: payload.tax_types } },
    { $push: { tax_orders_id: result._id } },
  );

  return result;
};

const getTaxService = async () => {
  // Implementation for getting a tax service
  const result = await Tax.find({});
  return result;
};

const getUserOrderService = async (userId: string) => {
  // Implementation for getting a user order service
  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User id is required');
  }
  const result = await Tax.find({ userId });
  return result;
};

const getSingleTaxService = async (id: string) => {
  // Implementation for getting a single tax service
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax id is required');
  }
  const result = await Tax.findById(id);
  return result;
};

const updateTaxService = async (id: string, payload: any) => {
  // Implementation for updating a tax service
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax id is required');
  }
  const result = await Tax.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteTaxService = async (id: string) => {
  // Implementation for deleting a tax service
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax id is required');
  }
  const result = await Tax.findByIdAndDelete(id);
  return result;
};

export const TaxService = {
  createForTaxService,
  getTaxService,
  getSingleTaxService,
  updateTaxService,
  deleteTaxService,
  getUserOrderService,
};
