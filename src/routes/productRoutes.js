import express from 'express';
import ProductController from '../controllers/productController.js';
import VendorAuthMiddleware from '../middlewares/vendorMiddleware.js'; 
const router = express.Router();
const controller = new ProductController();

// PUBLIC ROUTES 
router.get('/', controller.getMany);
router.get('/:id', controller.getOne);

// PROTECTED ROUTES - Only JWT auth needed
router.use(VendorAuthMiddleware.auth); 
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
