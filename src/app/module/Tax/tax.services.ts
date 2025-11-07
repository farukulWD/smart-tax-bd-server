import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { extractText, validateETIN } from '../../utils';

const createForTaxService = async (
  files: Express.Multer.File[],
  payload: any
) => {
  // Implementation for creating a tax service
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

  return { text, isValid };
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
