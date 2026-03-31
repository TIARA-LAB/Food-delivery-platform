import walletService from '../service/walletService.js';
import { validateTopUp } from '../service/walletService.js';
import PaystackAPI from 'paystack';  

const paystack = PaystackAPI(process.env.PAYSTACK_SECRET_KEY);

export const getBalance = async (req, res, next) => {
  try {
    const balance = await walletService.getBalance(req.user.id);
    res.json({ 
      success: true, 
      data: { balance },
      message: 'Balance retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const { limit, cursor } = req.query;
    const history = await walletService.getWalletHistory(
      req.user.id,
      parseInt(limit) || 50,
      cursor
    );
    res.json({ 
      success: true, 
      data: history,
      message: 'Transaction history retrieved'
    });
  } catch (error) {
    next(error);
  }
};


export const topUp = async (req, res, next) => {
  try {
    const { amount } = req.body;
    
    const numericAmount = Number(amount);
    validateTopUp({ amount: numericAmount });
    
    const result = await walletService.topUp(req.user.id, {
      amount: numericAmount,
      paymentId: `pay_${Date.now()}_${req.user.id}`
    });
    
    res.status(201).json({
      success: true,
      message: 'Wallet topped up successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const payOrder = async (req, res, next) => {
  try {
    const { amount, orderId } = req.body;
    const numericAmount = Number(amount);
    
    if (typeof numericAmount !== 'number' || numericAmount <= 0) {
      throw new Error('Amount must be positive number');
    }
    if (!orderId || typeof orderId !== 'string') {
      throw new Error('Valid orderId required');
    }
    
    const result = await walletService.deductForOrder(req.user.id, {
      amount: numericAmount,
      orderId
    });
    
    res.json({ 
      success: true, 
      data: result,
      message: 'Order paid successfully from wallet'
    });
  } catch (error) {
    next(error);
  }
};

// PAYSTACK INITIALIZE 
export const initializeTopUp = async (req, res, next) => {
  try {
    const { amount, email } = req.body;
    
    const numericAmount = Number(amount);
    validateTopUp({ amount: numericAmount });
    
    const result = await paystack.transaction.initialize({
      amount: numericAmount * 100,  // kobo
      email: email || `${req.user.id}@example.com`,
      callback_url: `http://localhost:5000/api/wallet/verify-topup?reference={{REFERENCE}}`,
      metadata: {
        userId: req.user.id,
        custom_fields: [{
          display_name: 'Top-up Amount',
          variable_name: 'topup_amount',
          value: numericAmount.toString()
        }]
      }
    });

    res.status(200).json({
      success: true,
      message: 'Redirect to Paystack',
      data: {
        authorization_url: result.data.authorization_url,
        reference: result.data.reference,
        access_code: result.data.access_code
      }
    });
  } catch (error) {
    console.error('Paystack init error:', error);
    next(error);
  }
};

// PAYMENT VERIFICATION (Callback)
export const verifyTopUp = async (req, res, next) => {
  try {
    const { reference } = req.query;
    
    if (!reference) {
      return res.status(400).json({ success: false, message: 'No reference' });
    }
    
    const result = await paystack.transaction.verify(reference);
    
    if (result.data.status === 'success') {
      res.json({ 
        success: true, 
        message: 'Payment successful! Check balance shortly (webhook processing)',
        data: result.data 
      });
    } else {
      res.status(400).json({ success: false, message: 'Payment failed' });
    }
  } catch (error) {
    next(error);
  }
};

// PAYSTACK WEBHOOK (Localhost)
export const paystackWebhook = async (req, res) => {
  try {
    const event = req.body;
    console.log('Paystack:', event.event);
    
    if (event.event === 'charge.success') {
      const { data } = event;
      const userId = data.metadata.userId;
      const amountStr = data.metadata.custom_fields?.find(f => f.variable_name === 'topup_amount')?.value;
      const amount = parseFloat(amountStr);
      
      console.log(`Crediting ${userId}: ₦${amount}`);
      
      if (userId && amount >= 100) {
        await walletService.topUp(userId, {
          amount,
          paymentId: data.reference
        });
        console.log('Wallet credited!');
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
};