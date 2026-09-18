import { once } from 'events';
import { Server } from 'http';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'mongodb://127.0.0.1:27017/smarttax_test';

const LOCAL_HOSTS = ['127.0.0.1', 'localhost'];

/**
 * Everything that seeds or tests drops the database first, so refuse anything
 * that is not on this machine — a typo in an env var must never wipe Atlas.
 */
export const assertLocalDatabase = (url: string) => {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    // multi-host connection strings do not parse; they are never local
  }

  if (!LOCAL_HOSTS.includes(host)) {
    throw new Error(
      `Refusing to touch a non-local database (host "${host || url}")`,
    );
  }
};

export const connectTestDatabase = async (url = TEST_DATABASE_URL) => {
  assertLocalDatabase(url);
  await mongoose.connect(url);
};

export const resetTestDatabase = async () => {
  const host = mongoose.connection.host;
  if (!LOCAL_HOSTS.includes(host)) {
    throw new Error(`Refusing to drop a non-local database (host "${host}")`);
  }
  await mongoose.connection.dropDatabase();
};

export type TApiResponse = {
  status: number;
  body: {
    success?: boolean;
    message?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
  } | null;
};

export type TApiClient = (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options?: { token?: string; body?: unknown },
) => Promise<TApiResponse>;

export const startTestServer = async () => {
  const { default: app } = await import('../app');
  const server: Server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const api: TApiClient = async (method, path, options = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(options.token ? { authorization: options.token } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  };

  const login = async (mobile: string, password: string) => {
    const res = await api('POST', '/auth/login', { body: { mobile, password } });
    if (res.status !== 200) {
      throw new Error(`Login failed for ${mobile}: ${JSON.stringify(res.body)}`);
    }
    return res.body?.data?.accessToken as string;
  };

  const close = async () => {
    const closed = once(server, 'close');
    server.close();
    // fetch keeps sockets alive, which would hold `close` open indefinitely
    server.closeAllConnections();
    await closed;
  };

  return { api, login, close };
};
