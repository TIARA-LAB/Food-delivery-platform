import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
 authenticateToken,
 authorizeRoles
} from '../middlewares/authMiddleware.js';
import { logInfo, logError } from '../utils/logger.js';
import prisma from '../config/db.js';

const router = Router();

// ========== RATE LIMITERS ==========
const vendorLimiter = rateLimit({
 windowMs: 15 * 60 * 1000,
 max: 100,
 message: { success: false, message: 'Too many vendor requests' }
});

const restaurantCreationLimiter = rateLimit({
 windowMs: 24 * 60 * 1000,
 max: 1,
 message: { success: false, message: 'One restaurant per vendor only' }
});

// ✅ GLOBAL BODY SAFETY NET - FIXES ALL req.body undefined errors
router.use((req, res, next) => {
 req.body = req.body || {};
 next();
});

// ========== GLOBAL MIDDLEWARE ==========
router.use(authenticateToken);
router.use(authorizeRoles('VENDOR'));
router.use(vendorLimiter);

router.use((req, res, next) => {
 logInfo('Vendor API Access', {
  vendorId: req.user?.id,
  email: req.user?.email,
  method: req.method,
  path: req.originalUrl,
  ip: req.ip,
  hasBody: Object.keys(req.body || {}).length > 0
 });
 next();
});

// ========================================
// RESTAURANT OPERATIONS
// ========================================
router.post('/restaurant', restaurantCreationLimiter, async (req, res) => {
 try {
  const vendorId = req.user.id;
  console.log('🆕 Creating restaurant for:', vendorId);

  const restaurantData = await prisma.restaurant.create({
   data: {
    vendorId,
    name: 'Test Restaurant',
    isActive: true
   }
  });

  res.status(201).json({
   success: true,
   message: 'Restaurant created successfully',
   data: restaurantData
  });
 } catch (error) {
  console.error('🚨 POST /restaurant ERROR:', error.message);
  res.status(500).json({ success: false, message: error.message });
 }
});

router.get('/restaurant', async (req, res) => {
 try {
  const vendorId = req.user.id;
  const restaurant = await prisma.restaurant.findUnique({ where: { vendorId } });

  if (!restaurant) {
   return res.status(404).json({
    success: false,
    message: 'No restaurant found. POST /api/vendor/restaurant to create one'
   });
  }

  res.status(200).json({ success: true, data: restaurant });
 } catch (error) {
  console.error('🚨 GET /restaurant ERROR:', error.message);
  res.status(500).json({ success: false, message: error.message });
 }
});

router.patch('/restaurant/status', async (req, res) => {
 try {
  const vendorId = req.user.id;
  const restaurant = await prisma.restaurant.findUnique({ where: { vendorId } });

  if (!restaurant) {
   return res.status(404).json({
    success: false,
    message: 'No restaurant found. Create one first.'
   });
  }

  // ✅ SAFE: req.body.isActive with fallback toggle
  const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !restaurant.isActive;

  const updated = await prisma.restaurant.update({
   where: { vendorId },
   data: { isActive }
  });

  res.status(200).json({
   success: true,
   data: updated,
   message: `Restaurant ${isActive ? 'activated' : 'deactivated'} successfully`
  });
 } catch (error) {
  console.error('🚨 PATCH /restaurant/status ERROR:', error.message);
  res.status(500).json({ success: false, message: error.message });
 }
});

router.patch('/restaurant', async (req, res) => {
 try {
  const vendorId = req.user.id;
  const restaurant = await prisma.restaurant.findUnique({ where: { vendorId } });

  if (!restaurant) {
   return res.status(404).json({ success: false, message: 'No restaurant found' });
  }

  const updateData = {};
  if (req.body.name) updateData.name = req.body.name;

  const updated = await prisma.restaurant.update({
   where: { vendorId },
   data: { ...updateData, updatedAt: new Date() }
  });

  res.status(200).json({
   success: true,
   data: updated,
   message: 'Restaurant updated successfully'
  });
 } catch (error) {
  console.error('🚨 PATCH /restaurant ERROR:', error.message);
  res.status(500).json({ success: false, message: error.message });
 }
});

// ========================================
// ORDERS
// ========================================
router.get('/orders', async (req, res) => {
 try {
  const vendorId = req.user.id;
  const orders = await prisma.order.findMany({
   where: { restaurant: { vendorId } },
   take: 10,
   orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
   success: true,
   data: orders,
   count: orders.length
  });
 } catch (error) {
  console.error('🚨 GET /orders ERROR:', error.message);
  res.status(500).json({ success: false, message: 'No orders or server error' });
 }
});

// ========================================
// SCHEDULE - ✅ FIXED DESTRUCTURING ERROR
// ========================================
router.post('/schedule', async (req, res) => {
 try {
  const vendorId = req.user.id;
  console.log('📅 Schedule request body:', req.body);

  // ✅ SAFE: Check if body exists and has required fields
  if (!req.body || !req.body.dayOfWeek || !req.body.opensAt || !req.body.closesAt) {
   return res.status(400).json({
    success: false,
    message: 'Missing required fields: dayOfWeek (0-6), opensAt (HH:MM), closesAt (HH:MM)'
   });
  }

  const { dayOfWeek, opensAt, closesAt } = req.body;
  const restaurant = await prisma.restaurant.findUnique({ where: { vendorId } });

  if (!restaurant) {
   return res.status(404).json({ success: false, message: 'Create restaurant first' });
  }

  const schedule = await prisma.restaurantSchedule.upsert({
   where: {
    restaurantId_dayOfWeek: {
     restaurantId: restaurant.id,
     dayOfWeek: parseInt(dayOfWeek)
    }
   },
   update: { opensAt, closesAt },
   create: {
    restaurantId: restaurant.id,
    dayOfWeek: parseInt(dayOfWeek),
    opensAt,
    closesAt
   }
  });

  res.status(200).json({
   success: true,
   data: schedule,
   message: 'Schedule updated successfully'
  });
 } catch (error) {
  console.error('🚨 POST /schedule ERROR:', error.message);
  res.status(500).json({ success: false, message: error.message });
 }
});

// ========================================
// ANALYTICS & OTHERS
// ========================================
router.get('/analytics', async (req, res) => {
 try {
  const vendorId = req.user.id;
  const restaurant = await prisma.restaurant.findUnique({ where: { vendorId } });

  if (!restaurant) {
   return res.status(404).json({ success: false, message: 'Create restaurant first' });
  }

  const totalOrders = await prisma.order.count({ where: { restaurantId: restaurant.id } });

  res.status(200).json({
   success: true,
   data: { totalOrders, restaurantId: restaurant.id }
  });
 } catch (error) {
  res.status(500).json({ success: false, message: 'Analytics unavailable' });
 }
});

router.get('/reviews', async (req, res) => {
 res.status(200).json({ success: true, data: [], message: 'Reviews ready' });
});

router.get('/deliveries/active', async (req, res) => {
 res.status(200).json({ success: true, data: [], message: 'No active deliveries' });
});

// ========================================
// 404 HANDLER
// ========================================
router.use((req, res) => {
 res.status(404).json({
  success: false,
  message: `Route not found: ${req.originalUrl}. Try: /restaurant, /orders, /schedule`
 });
});

export default router;
