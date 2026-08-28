import express, { Application } from 'express';
import cors from 'cors';
import router from './app/routes/routes';
import cookieParser from 'cookie-parser';
import globalErrorHandler from './app/middlewares/globalErrorhandler';
import notFound from './app/middlewares/notFound';
import AppError from './app/errors/AppError';
import httpStatus from 'http-status';

const app: Application = express();

// nginx proxies to 127.0.0.1:5000, so without this every request looks like it
// came from the loopback address. Anything keyed on the client IP — the OTP
// rate limiters chief among them — would then share one bucket for all users.
// `1` = trust exactly one proxy hop (nginx), so X-Forwarded-For cannot be spoofed
// by the client.
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://smart-tax-bd-client.vercel.app',
  'https://smart-tax-bd-admin.vercel.app',
  'http://smarttaxbd.com',
  'https://smarttaxbd.com',
  'https://www.smarttaxbd.com',
  'https://admin.smarttaxbd.com',
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new AppError(httpStatus.BAD_GATEWAY, 'Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Welcome to Smart Tax BD API' });
});

app.use('/api/v1', router);

app.use(globalErrorHandler);
app.use(notFound);

export default app;
