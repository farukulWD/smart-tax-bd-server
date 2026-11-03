/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import config from '../config';
import AppError from '../errors/AppError';
import handleCastError from '../errors/handleCastError';
import handleDuplicateError from '../errors/handleDuplicateError';
import handleValidationError from '../errors/handleValidationError';
import handleZodError from '../errors/handleZodError';
import { TErrorSources } from '../interface/error';
import { errorlogger } from '../shared/logger';

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Log a summary only: dumping the raw error would write secrets such as an
  // AxiosError's auth headers and request body to the server logs.
  errorlogger.error(
    `${req.method} ${req.originalUrl} failed: ${err?.name ?? 'Error'}: ${err?.message ?? err}${err?.stack ? `\n${err.stack}` : ''}`,
  );
  // Setting default values
  let statusCode = 500;
  let message = 'Something went wrong!';
  let needsVerification: boolean | undefined;
  let errorSources: TErrorSources = [
    {
      path: '',
      message: 'Something went wrong',
    },
  ];

  if (err instanceof ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.name === 'ValidationError') {
    const simplifiedError = handleValidationError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.name === 'CastError') {
    const simplifiedError = handleCastError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.code === 11000) {
    const simplifiedError = handleDuplicateError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err instanceof AppError) {
    statusCode = err?.statusCode;
    message = err.message;
    needsVerification = err?.needsVerification;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  } else if (err instanceof Error) {
    message = err.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  }

  // ultimate return - but Express doesn't expect a return type, so no need for explicit return
  res.status(statusCode).json({
    success: false,
    message,
    needsVerification,
    errorSources,
    // The raw error can hold secrets (e.g. an AxiosError's auth headers).
    err: config.env === 'development' ? err : undefined,
    stack: config.env === 'development' ? err?.stack : null,
  });
};

export default globalErrorHandler;
