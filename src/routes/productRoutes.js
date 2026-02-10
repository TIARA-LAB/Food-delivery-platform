import express from 'express';
import ProductController from '../controllers/productController.js';
import VendorAuthMiddleware from '../middlewares/vendorMiddleware.js'; 
import { schemas, validateRequest } from '../validation/productValidation.js';

const router = express.Router();
const controller = new ProductController();

//  PUBLIC ROUTES (Customers can access)
router.get('/', controller.getMany);                 
router.get('/:id', controller.getOne);               

// VENDOR-ONLY DISCOUNT ROUTES (Auth + Validation FIRST)
router.post('/:id/discount', 
  VendorAuthMiddleware.auth,
  validateRequest(schemas.discount),
  controller.addDiscount
); 

router.patch('/:id/discount', 
  VendorAuthMiddleware.auth,
  validateRequest(schemas.discount),
  controller.updateDiscount
); 

router.delete('/:id/discount', 
  VendorAuthMiddleware.auth,
  controller.removeDiscount
);

// PROTECTED ROUTES (Global auth)
router.use(VendorAuthMiddleware.auth); 

//  CORE PRODUCT CRUD
router.post('/', 
  validateRequest(schemas.create),
  controller.create
);                   

router.patch('/:id', 
  validateRequest(schemas.update),
  controller.update
);         

router.delete('/:id', controller.deleteOne);         

export default router;
