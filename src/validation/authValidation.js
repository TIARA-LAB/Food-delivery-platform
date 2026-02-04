import { body } from 'express-validator';

export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage('Password: 8+ chars, 1 upper, 1 lower, 1 number'),
  body('name')
    .notEmpty()
    .trim()
    .escape()
    .isLength({ max: 50 })
    .withMessage('Name required, max 50 characters'),
  body('role')
    .optional()
    .isIn(['ADMIN', 'VENDOR', 'DELIVERY', 'CUSTOMER'])
    .withMessage('Invalid role')
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password required')
];

export const resendVerificationValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required')
];
