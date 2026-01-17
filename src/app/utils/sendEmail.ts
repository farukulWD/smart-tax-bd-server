import nodemailer from 'nodemailer';
import config from '../config';

export const sendEmail = async (to: string, html: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: config.env === 'production',
    auth: {
      // TODO: replace `user` and `pass` values from <https://forwardemail.net>
      user: config.email_user,
      pass: config.email_pass,
    },
  });

  await transporter.sendMail({
    from: 'smarttaxbd@gmail.com',
    to,
    subject: 'Reset your password within ten mins!',
    html,
  });
};
