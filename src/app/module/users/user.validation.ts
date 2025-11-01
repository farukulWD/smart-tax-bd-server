import { z } from 'zod';

// Enum values for role and status
const UserRoleEnum = z.enum(['superAdmin', 'user', 'admin']);
const UserStatusEnum = z.enum(['active', 'inactive']);

// Zod Schema
const userValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    mobile: z.string().min(10, { message: 'Mobile number is required' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters long' }),
    email: z.string().email({ message: 'Invalid email address' }).optional(),
  }),
});

// For use in request validation middleware
export { userValidationSchema };
