import AppError from '../../errors/AppError';
import { ITax } from './tax.interface';
import httpStatus from 'http-status';
import { Tax } from './tax.model';

const createTaxToDB = async (taxData: ITax) => {
  if (!taxData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax data is required');
  }
  const { userId, personal_iformation, source_of_income, tax_year } = taxData;
  const { name, email, phone } = personal_iformation;

  if (!userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User ID is required');
  }
  if (!personal_iformation) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Personal information is required',
    );
  }
  if (!name || !email || !phone) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Name, email, and phone are required in personal information',
    );
  }
  if (!source_of_income || source_of_income.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'At least one source of income is required',
    );
  }
  if (!tax_year) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Tax year is required');
  }
  const result = await Tax.create(taxData);
  return result;
};

export const TaxService = {
  createTaxToDB,
};
