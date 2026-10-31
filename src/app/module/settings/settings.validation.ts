import { z } from 'zod';

const updateSettingsValidationSchema = z.object({
  body: z.object({
    service_fee: z
      .number({ message: 'Service fee must be a number' })
      .min(0, { message: 'Service fee cannot be negative' }),
  }),
});

export const SettingsValidation = {
  updateSettingsValidationSchema,
};
