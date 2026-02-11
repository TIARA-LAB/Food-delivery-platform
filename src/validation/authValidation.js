import { body } from 'express-validator';

export const registerValidation = [
  body('email')
    .trim()
    .notEmpty()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),

  body('password')
    .trim()
    .notEmpty()
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be 8+ characters with 1 uppercase, 1 lowercase, 1 number'),


  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 50 })
    .escape()
    .withMessage('Name must be 2-50 characters'),

  body('role')
    .optional()
    .isIn(['ADMIN', 'VENDOR', 'DELIVERY', 'CUSTOMER'])
    .withMessage('Invalid role specified')
];

export const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),

  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
];

export const resendVerificationValidation = [
  body('email')
    .trim()
    .notEmpty()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required')
];
