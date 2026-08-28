import { CookieOptions } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../../config';

export const REFRESH_TOKEN_COOKIE = 'refreshToken';

const REFRESH_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 365; // 1 year

/**
 * Single source of truth for the refresh cookie's attributes.
 *
 * `res.clearCookie` only removes a cookie when the domain/path/sameSite it is
 * given match the ones the cookie was set with, so setting and clearing must
 * read from the same place — otherwise the production cookie (scoped to
 * `.smarttaxbd.com`) survives logout and keeps minting access tokens.
 *
 * Pass `withMaxAge: false` when clearing; `clearCookie` supplies its own.
 */
export const refreshCookieOptions = (withMaxAge = true): CookieOptions => ({
  secure: config.env === 'production',
  httpOnly: true,
  sameSite: 'strict',
  domain: config.env === 'production' ? '.smarttaxbd.com' : undefined,
  ...(withMaxAge ? { maxAge: REFRESH_COOKIE_MAX_AGE } : {}),
});

export const createToken = (
  jwtPayload: { userId: string; role: string; mobile?: string },
  secret: string,
  expiresIn: string,
) => {
  return jwt.sign(jwtPayload, secret, {
    expiresIn: expiresIn as any,
  });
};

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret) as JwtPayload;
};
