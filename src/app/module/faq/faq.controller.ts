import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { FaqService } from './faq.service';

const getPublicFaqs = catchAsync(async (req, res) => {
  const result = await FaqService.getPublicFaqsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'FAQs fetched successfully',
    data: result,
  });
});

const getAllFaqsAdmin = catchAsync(async (req, res) => {
  const result = await FaqService.getAllFaqsAdminFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'FAQs fetched successfully',
    data: result,
  });
});

const createFaq = catchAsync(async (req, res) => {
  const result = await FaqService.createFaqToDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'FAQ created successfully',
    data: result,
  });
});

const updateFaq = catchAsync(async (req, res) => {
  const result = await FaqService.updateFaqInDB(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'FAQ updated successfully',
    data: result,
  });
});

const reorderFaqs = catchAsync(async (req, res) => {
  const result = await FaqService.reorderFaqsInDB(req.body.items);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'FAQs reordered successfully',
    data: result,
  });
});

const deleteFaq = catchAsync(async (req, res) => {
  const result = await FaqService.deleteFaqFromDB(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'FAQ deleted successfully',
    data: result,
  });
});

export const FaqController = {
  getPublicFaqs,
  getAllFaqsAdmin,
  createFaq,
  updateFaq,
  reorderFaqs,
  deleteFaq,
};
