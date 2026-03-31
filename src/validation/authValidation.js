import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(8),
    phone: z.string().optional(),
    role: z.enum(['CUSTOMER', 'VENDOR', 'RIDER', 'ADMIN'])
  })
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email address" }),
    otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits")
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string()
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string()
  })
});

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse({
        body: req.body
      });
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const issues = error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: issues
        });
      }
      res.status(400).json({
        error: 'Validation failed',
        details: error.message
      });
    }
  };
};
