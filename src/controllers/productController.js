import ProductService from '../service/productService.js';
import { schemas, validateRequest } from '../validation/productValidation.js';

export default class ProductController {
  constructor(service = new ProductService()) {
    this.service = service;
  }

  // PUBLIC ROUTES 
  getMany = async (req, res, next) => {
    try {
      const result = await this.service.getMany(req.query);
      res.json(result);
    } catch (error) {
      console.error('GET MANY ERROR:', error.message);
      next(error);
    }
  };

  getOne = async (req, res, next) => {
    try {
      const { id: productId } = req.params;
      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Valid product id is required'
        });
      }

      const product = await this.service.getOne(productId);
      res.json({ success: true, data: product });
    } catch (error) {
      console.error(' GET ONE ERROR:', error.message);
      next(error);
    }
  };

  // PROTECTED ROUTES - Single handlers
  create = async (req, res, next) => {
    try {
      const vendorId = req.user?.id;
      if (!vendorId) throw new Error('Vendor not authenticated');

      console.log('CREATING PRODUCT:', req.validatedData || req.body);
      const product = await this.service.create(req.validatedData || req.body, vendorId);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      console.error('CREATE ERROR:', error.message);
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const vendorId = req.user?.id;
      if (!vendorId) throw new Error('Vendor not authenticated');

      const { id: productId } = req.params;
      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Valid product id is required'
        });
      }

      const product = await this.service.update(productId, req.validatedData || req.body, vendorId);
      res.json({ success: true, data: product });
    } catch (error) {
      console.error('UPDATE ERROR:', error.message);
      next(error);
    }
  };

  deleteOne = async (req, res, next) => {
    try {
      const vendorId = req.user?.id;
      if (!vendorId) throw new Error('Vendor not authenticated');

      const { id: productId } = req.params;
      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Valid product id is required'
        });
      }

      await this.service.delete(productId, vendorId);
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      console.error('DELETE ERROR:', error.message);
      next(error);
    }
  };

  // DISCOUNT OPERATIONS
  addDiscount = async (req, res, next) => {
    try {
      const vendorId = req.user?.id;
      if (!vendorId) throw new Error('Vendor not authenticated');

      const { id: productId } = req.params;
      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Valid product id is required in URL path'
        });
      }

      console.log('ADD DISCOUNT:', { productId, discountData: req.validatedData || req.body });
      const product = await this.service.addDiscount(productId, req.validatedData || req.body, vendorId);
      res.json({ success: true, data: product });
    } catch (error) {
      console.error('ADD DISCOUNT ERROR:', error.message);
      next(error);
    }
  };

  updateDiscount = async (req, res, next) => {
    try {
      const vendorId = req.user?.id;
      if (!vendorId) throw new Error('Vendor not authenticated');

      const { id: productId } = req.params;
      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Valid product id is required in URL path'
        });
      }

      console.log('UPDATE DISCOUNT:', { productId, discountData: req.validatedData || req.body });
      const product = await this.service.updateDiscount(productId, req.validatedData || req.body, vendorId);
      res.json({ success: true, data: product });
    } catch (error) {
      console.error('UPDATE DISCOUNT ERROR:', error.message);
      next(error);
    }
  };

  removeDiscount = async (req, res, next) => {
    try {
      const vendorId = req.user?.id;
      if (!vendorId) throw new Error('Vendor not authenticated');

      const { id: productId } = req.params;
      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Valid product id is required in URL path'
        });
      }

      const product = await this.service.removeDiscount(productId, vendorId);
      res.json({ success: true, data: product });
    } catch (error) {
      console.error('REMOVE DISCOUNT ERROR:', error.message);
      next(error);
    }
  };

  // VALIDATION METHODS
  validateCreate() {
    return validateRequest('create');
  }

  validateUpdate() {
    return validateRequest('update');
  }

  validateDiscount() {
    return validateRequest('discount');
  }
}
