import crypto from 'crypto';
import axios from 'axios';
import httpStatus from 'http-status';
import config from '../config';
import AppError from '../errors/AppError';
import { errorlogger } from '../shared/logger';

// EPS (Easy Payment System) gateway client.
// Every call signs one field with HMAC-SHA512 keyed by the UTF-8 hash key and
// sends the base64 digest in the `x-hash` header.

type TEpsTokenResponse = {
  token: string | null;
  expireDate: string | null;
  errorMessage: string | null;
  errorCode: string | null;
};

export type TEpsInitializePayload = {
  CustomerOrderId: string;
  merchantTransactionId: string;
  totalAmount: number;
  ipAddress?: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerPostcode: string;
  customerCountry: string;
  customerPhone: string;
  productName: string;
  productProfile?: string;
  productCategory?: string;
  noOfItem?: string;
  valueA?: string;
  valueB?: string;
  valueC?: string;
  valueD?: string;
};

type TEpsInitializeResponse = {
  TransactionId: string | null;
  RedirectURL: string | null;
  ErrorMessage: string | null;
  ErrorCode: string | null;
};

export type TEpsTransactionStatus = {
  MerchantTransactionId: string;
  Status: string;
  TotalAmount: string;
  TransactionDate: string;
  TransactionType: string;
  FinancialEntity: string | null;
  ErrorCode: string | null;
  ErrorMessage: string | null;
};

const epsClient = axios.create({
  baseURL: config.eps.base_url,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export const generateEpsHash = (
  value: string,
  hashKey: string = config.eps.hash_key || '',
) =>
  crypto
    .createHmac('sha512', Buffer.from(hashKey, 'utf8'))
    .update(value, 'utf8')
    .digest('base64');

// EPS requires a numeric merchantTransactionId of at least 10 digits. The
// random suffix keeps IDs hard to guess, since they appear in return URLs.
export const generateMerchantTransactionId = () =>
  `${Date.now()}${crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')}`;

// Payments must never run half-configured. Above all, a production server
// pointed at the sandbox would accept fake sandbox payments as real ones and
// place orders for free.
const assertEpsConfigured = () => {
  const { base_url, merchant_id, store_id, username, password, hash_key } =
    config.eps;
  const missing = !merchant_id || !store_id || !username || !password;
  const sandboxInProduction =
    config.env === 'production' &&
    /sandbox/i.test(base_url) &&
    !config.eps.allow_sandbox;
  if (missing || !hash_key || sandboxInProduction) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Online payment is not available right now',
    );
  }
};

let cachedToken: { token: string; expiresAt: number } | null = null;

export const getEpsToken = async () => {
  assertEpsConfigured();

  // Refresh a minute early so a token never expires mid-request.
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.token;
  }

  const userName = config.eps.username || '';
  const { data } = await epsClient.post<TEpsTokenResponse>(
    '/v1/Auth/GetToken',
    { userName, password: config.eps.password },
    { headers: { 'x-hash': generateEpsHash(userName) } },
  );

  if (!data?.token) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      data?.errorMessage || 'Failed to authenticate with EPS',
    );
  }

  // EPS returns a timezone-less timestamp; fall back to 30 minutes if it does
  // not parse.
  const expiresAt = data.expireDate ? Date.parse(data.expireDate) : NaN;
  cachedToken = {
    token: data.token,
    expiresAt: Number.isNaN(expiresAt) ? Date.now() + 30 * 60_000 : expiresAt,
  };

  return cachedToken.token;
};

export const initializeEpsPayment = async (payload: TEpsInitializePayload) => {
  const token = await getEpsToken();
  const { data } = await epsClient.post<TEpsInitializeResponse>(
    '/v1/EPSEngine/InitializeEPS',
    {
      merchantId: config.eps.merchant_id,
      storeId: config.eps.store_id,
      transactionTypeId: 1, // 1 = Web
      financialEntityId: 0,
      transitionStatusId: 0,
      version: '1',
      shippingMethod: 'NO',
      ...payload,
    },
    {
      headers: {
        'x-hash': generateEpsHash(payload.merchantTransactionId),
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!data?.RedirectURL) {
    // EPS's own text ("An error occured while initalizing the transaction")
    // means nothing to a customer, and EPS also returns it when several
    // checkouts are opened within about a minute. Log it, show a clear message.
    errorlogger.error(
      `EPS InitializeEPS failed for ${payload.merchantTransactionId}: ${data?.ErrorCode ?? ''} ${data?.ErrorMessage ?? 'no message'}`,
    );
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      'The payment gateway is busy right now. Please wait a minute and try again.',
    );
  }

  return data;
};

export const verifyEpsTransaction = async (merchantTransactionId: string) => {
  const token = await getEpsToken();
  const { data } = await epsClient.get<TEpsTransactionStatus>(
    '/v1/EPSEngine/CheckMerchantTransactionStatus',
    {
      params: { merchantTransactionId },
      headers: {
        'x-hash': generateEpsHash(merchantTransactionId),
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!data?.Status) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      data?.ErrorMessage || 'Failed to verify EPS transaction',
    );
  }

  return data;
};
