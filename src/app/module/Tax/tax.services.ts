import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { extractText, validateETIN } from '../../utils';
import { sendImageToCloudinary } from '../../utils/sendImageToCloudinary';
import { Tax } from './tax.model';

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
  payload: any
) => {
  for (const field of [...REQUIRED_FILES, ...OPTIONAL_FILES]) {
    const found = files.find(f => f.fieldname === field);

    // validate required
    if (!found && REQUIRED_FILES.includes(field)) {
      throw new AppError(httpStatus.BAD_REQUEST, `${field} is required`);
    }

    if (found) {
      const imageName = `${payload?.mobile}_${field}`;
      const path = found.path;
      const { secure_url } = await sendImageToCloudinary(imageName, path);
      payload[field] = secure_url as string;
    }
  }
};

const createForTaxService = async (
  files: Express.Multer.File[],
  payload: any
) => {
  const etinFile = files.find(f => f.fieldname === 'etin_file');
  if (!etinFile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'etin_file is required');
  }

  const text = await extractText(etinFile);
  const isValid = validateETIN(text);

  if (!isValid) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'The tin certificate is not valid'
    );
  }

  await uploadFilesToCloud(files, payload);

  console.log(payload);

  if (!payload.mobile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Mobile number is required');
  }

  if (!payload.etin_number) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tin number is required');
  }

  if (!payload.tax_year) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tin number is required');
  }

  const result = await Tax.create(payload);

  return result;
};

const getTaxService = () => {
  // Implementation for getting a tax service
};

const updateTaxService = () => {
  // Implementation for updating a tax service
};

const deleteTaxService = () => {
  // Implementation for deleting a tax service
};

export const TaxService = {
  createForTaxService,
  getTaxService,
  updateTaxService,
  deleteTaxService,
};
