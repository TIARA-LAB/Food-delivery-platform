import { ProductRepository } from '../repository/productRepository.js';
import { AppError } from '../utils/error.js';
import { logError, logInfo } from '../utils/logger.js';

export default class ProductService {
  constructor() {
    this.repo = new ProductRepository();
  }

  async create(data, vendorId) {
    try {
      //  Use repository for restaurant validation
      const { restaurant, hasAccess } = await this.repo.validateRestaurantOwnership(
        data.restaurantId, 
        vendorId
      );
      
      if (!restaurant || !hasAccess) {
        throw new AppError('Access denied to this restaurant', 403);
      }

      logInfo('Creating product', { vendorId, restaurantId: data.restaurantId });
      return await this.repo.create(data);
    } catch (error) {
      logError('Product creation failed', { vendorId, data: data.restaurantId, error: error.message });
      throw error;
    }
  }

  async getMany(query) {
    try {
      const { page = 1, limit = 10, search, restaurantId, categoryId, available } = query;
      const skip = (page - 1) * Number(limit);
      
      const where = {
        ...(restaurantId && { restaurantId }),
        ...(categoryId && { categoryId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(available !== undefined && { isAvailable: available === 'true' })
      };

      const { data, total } = await this.repo.findMany({ 
        skip, 
        take: Number(limit), 
        where 
      });
      
      logInfo('Products fetched', { page, limit, total, filters: query });
      
      return {
        data: data.map(product => this.withDiscounts(product)),
        meta: { 
          page: Number(page), 
          limit: Number(limit), 
          total, 
          pages: Math.ceil(total / Number(limit)) 
        }
      };
    } catch (error) {
      logError('Fetch products failed', { query, error: error.message });
      throw new AppError(error.message, 500);
    }
  }

  async getOne(id) {
    try {
      const product = await this.repo.findById(id);
      if (!product) {
        throw new AppError('Product not found', 404);
      }
      if (!product.restaurant.isActive) {
        throw new AppError('Restaurant is inactive', 400);
      }
      return this.withDiscounts(product);
    } catch (error) {
      logError('Get product failed', { id, error: error.message });
      throw error;
    }
  }

  async update(id, data, vendorId) {
    try {
      const product = await this.repo.findById(id);
      if (!product) throw new AppError('Product not found', 404);
      if (product.restaurant.vendorId !== vendorId) {
        throw new AppError('Access denied', 403);
      }
      if (!product.restaurant.isActive) {
        throw new AppError('Restaurant is inactive', 400);
      }

      if (data.price && data.originalPrice && data.price > data.originalPrice) {
        throw new AppError('Sale price cannot exceed original price', 400);
      }

      logInfo('Updating product', { id, changes: Object.keys(data) });
      return await this.repo.update(id, data);
    } catch (error) {
      logError('Product update failed', { id, vendorId, error: error.message });
      throw error;
    }
  }

  async delete(id, vendorId) {
    try {
      const product = await this.repo.findById(id);
      if (!product) throw new AppError('Product not found', 404);
      if (product.restaurant.vendorId !== vendorId) {
        throw new AppError('Access denied', 403);
      }
      if (!product.restaurant.isActive) {
        throw new AppError('Restaurant is inactive', 400);
      }

      logInfo('Deleting product', { id });
      return await this.repo.delete(id);
    } catch (error) {
      logError('Product delete failed', { id, vendorId, error: error.message });
      throw error;
    }
  }

  withDiscounts(product) {
    const hasDiscount = product.discountPercent > 0 && 
      (!product.discountExpiry || new Date(product.discountExpiry) > new Date());
    
    const finalPrice = hasDiscount 
      ? Number((product.price * (1 - product.discountPercent / 100)).toFixed(2))
      : product.price;

    const savings = hasDiscount 
      ? Number((product.price * (product.discountPercent / 100)).toFixed(2))
      : 0;

    const daysLeft = product.discountExpiry 
      ? Math.ceil((new Date(product.discountExpiry) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      ...product,
      finalPrice,
      originalPrice: product.originalPrice || product.price,
      savings,
      hasDiscount,
      discountPercent: hasDiscount ? product.discountPercent : 0,
      daysLeft,
      isDiscounted: hasDiscount && savings > 0
    };
  }
}
