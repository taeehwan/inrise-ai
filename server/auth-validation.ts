import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email is too long')
  .transform(val => val.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  username: z.string().max(50).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: 'Privacy consent is required' })
  }),
  marketingConsent: z.boolean().optional().default(false)
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export function validateLogin(data: unknown): { 
  success: true; 
  data: LoginInput 
} | { 
  success: false; 
  errors: string[] 
} {
  const result = loginSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => err.message);
  return { success: false, errors };
}

export type ValidationErrorCode = 
  | 'INVALID_EMAIL_FORMAT'
  | 'INVALID_PASSWORD_FORMAT'
  | 'PRIVACY_CONSENT_REQUIRED'
  | 'VALIDATION_ERROR';

export function validateRegister(data: unknown): { 
  success: true; 
  data: RegisterInput 
} | { 
  success: false; 
  errors: string[];
  errorCode: ValidationErrorCode;
} {
  const result = registerSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => err.message);
  const firstError = result.error.errors[0];
  
  let errorCode: ValidationErrorCode = 'VALIDATION_ERROR';
  if (firstError) {
    const path = firstError.path.join('.');
    if (path === 'email') {
      errorCode = 'INVALID_EMAIL_FORMAT';
    } else if (path === 'password') {
      errorCode = 'INVALID_PASSWORD_FORMAT';
    } else if (path === 'privacyConsent') {
      errorCode = 'PRIVACY_CONSENT_REQUIRED';
    }
  }
  
  return { success: false, errors, errorCode };
}
