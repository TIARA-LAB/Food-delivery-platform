import express from 'express';
import ProductController from '../controllers/productController.js';
import VendorAuthMiddleware from '../middlewares/vendorMiddleware.js'; 

const router = express.Router();
const controller = new ProductController();

// PUBLIC ROUTES (Customers can access) 
router.get('/', controller.getMany);                 
router.get('/:id', controller.getOne);               

// ✅ FIXED: Auth BEFORE Validation
router.post('/', 
  VendorAuthMiddleware.auth,
  controller.validateCreate(),  
  controller.create
);                   

router.patch('/:id', 
  VendorAuthMiddleware.auth,
  controller.validateUpdate(),  
  controller.update
);         

router.delete('/:id', 
  VendorAuthMiddleware.auth,
  controller.deleteOne
);         

// DISCOUNT ROUTES
router.post('/:id/discount', 
  VendorAuthMiddleware.auth,
  controller.validateDiscount(),  
  controller.addDiscount
); 

router.patch('/:id/discount', 
  VendorAuthMiddleware.auth,
  controller.validateDiscount(), 
  controller.updateDiscount
); 

router.delete('/:id/discount', 
  VendorAuthMiddleware.auth,
  controller.removeDiscount
);

export default router;
