import ProductService from '../service/productService.js';
import { schemas, validateRequest } from '../validation/productValidation.js';

export default class ProductController {
  constructor(service = new ProductService()) {
    this.service = service;
  }

  create = [
    validateRequest(schemas.create),
    async (req, res, next) => {
      try {
        const product = await this.service.create(req.body, req.vendorId);
        res.status(201).json({ success: true, data: product });
      } catch (error) {
        next(error);
      }
    }
  ];

  getMany = async (req, res, next) => {
    try {
      const result = await this.service.getMany(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getOne = async (req, res, next) => {
    try {
      const product = await this.service.getOne(req.params.id);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  update = [
    validateRequest(schemas.update),
    async (req, res, next) => {
      try {
        const product = await this.service.update(req.params.id, req.body, req.vendorId);
        res.json({ success: true, data: product });
      } catch (error) {
        next(error);
      }
    }
  ];

  delete = async (req, res, next) => {
    try {
      await this.service.delete(req.params.id, req.vendorId);
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}
