import express from 'express';
import ProductController from '../controllers/productController.js';
import VendorAuthMiddleware from '../middlewares/vendorMiddleware.js'; 

const router = express.Router();
const controller = new ProductController();

// PUBLIC ROUTES (Customers can access) 
router.get('/', controller.getMany);                 
router.get('/:id', controller.getOne);               

// VENDOR-ONLY DISCOUNT ROUTES (Auth + Validation FIRST) 
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
  controller.removeDiscount );

// PROTECTED ROUTES (Vendor auth applied globally below)
router.use(VendorAuthMiddleware.auth); 


router.post('/', 
  controller.validateCreate(),  
  controller.create
);                   

router.patch('/:id', 
  controller.validateUpdate(),  
  controller.update
);         

router.delete('/:id', controller.deleteOne);         

export default router;
