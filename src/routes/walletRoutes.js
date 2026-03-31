import express from 'express';
import { 
  getBalance, getHistory, topUp, payOrder, 
  initializeTopUp, verifyTopUp, paystackWebhook 
} from '../controllers/walletController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Existing + Paystack
router.get('/balance', authenticateToken, getBalance);
router.get('/history', authenticateToken, getHistory);
router.post('/top-up', authenticateToken, topUp);  // Manual (testing)
router.post('/pay-order', authenticateToken, payOrder);

// 👈 NEW PAYSTACK
router.post('/top-up/initialize', authenticateToken, initializeTopUp);
router.get('/verify-topup', authenticateToken, verifyTopUp);

// 👈 WEBHOOK
router.post('/paystack-webhook', paystackWebhook);

export default router;