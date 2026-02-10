import { ProductRepository } from '../repository/productRepository.js';
import { AppError } from '../utils/error.js';
import { logError, logInfo } from '../utils/logger.js';
import prisma from '../config/db.js'; 

export default class ProductService {
  constructor() {
    this.repo = new ProductRepository();
  }

  async create(data, vendorId) {
    try {
      console.log('Service create - vendorId:', vendorId, 'data:', data);
      
      let { restaurantId } = data;
      
      // Auto-fetch restaurant if not provided
      if (!restaurantId) {
        console.log('No restaurantId, auto-fetching for vendor:', vendorId);
        const restaurant = await prisma.restaurant.findFirst({
          where: { vendorId },
          select: { id: true }
        });
        
        if (!restaurant) {
          console.log('No restaurant found for vendor:', vendorId);
          throw new AppError('No restaurant found for vendor', 404);
        }
        restaurantId = restaurant.id;
        console.log('Auto-assigned restaurantId:', restaurantId);
      }

      const { restaurant, hasAccess } = await this.repo.validateRestaurantOwnership(restaurantId, vendorId);
      if (!restaurant || !hasAccess) {
        throw new AppError('Access denied to this restaurant', 403);
      }

      logInfo('Creating product', { vendorId, restaurantId });
      return await this.repo.create({ ...data, restaurantId });
    } catch (error) {
      console.error('SERVICE CREATE ERROR:', error);
      logError('Product creation failed', { vendorId, error: error.message });
      throw error;
    }
  }

  async getMany(query) {
    try {
      const { page = 1, limit = 10, search, restaurantId, available } = query;
      const skip = (page - 1) * Number(limit);
      
      const where = {
        ...(restaurantId && { restaurantId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(available !== undefined && { isAvailable: available === 'true' })
      };

      console.log(' getMany query:', { page, limit, search, restaurantId, available });

      const { data, total } = await this.repo.findMany({ 
        skip: Number(skip), 
        take: Number(limit), 
        where 
      });
      
      const result = {
        data: data.map(product => this.withDiscounts(product)),
        meta: { 
          page: Number(page), 
          limit: Number(limit), 
          total, 
          pages: Math.ceil(total / Number(limit)) 
        }
      };

      console.log('getMany success:', { total: data.length, page });
      return result;
    } catch (error) {
      console.error('SERVICE GETMANY ERROR:', error);
      logError('Fetch products failed', { query, error: error.message });
      throw new AppError(error.message || 'Failed to fetch products', 500);
    }
  }

  async getOne(id) {
    try {
      console.log(' getOne id:', id);
      
      if (!id) throw new AppError('Product ID is required', 400);
      
      const product = await this.repo.findById(id);
      if (!product) {
        throw new AppError('Product not found', 404);
      }
      if (!product.restaurant?.isActive) {
        throw new AppError('Restaurant is inactive', 400);
      }
      
      const result = this.withDiscounts(product);
      console.log(' getOne success:', product.name);
      return result;
    } catch (error) {
      console.error(' SERVICE GETONE ERROR:', error);
      logError('Get product failed', { id, error: error.message });
      throw error;
    }
  }

  async update(id, data, vendorId) {
    try {
      console.log(' update id:', id, 'vendorId:', vendorId);
      
      if (!id) throw new AppError('Product ID is required', 400);
      
      const product = await this.repo.findById(id);
      if (!product) throw new AppError('Product not found', 404);
      if (product.restaurant.vendorId !== vendorId) {
        throw new AppError('Access denied', 403);
      }
      if (!product.restaurant.isActive) {
        throw new AppError('Restaurant is inactive', 400);
      }

      logInfo('Updating product', { id, changes: Object.keys(data) });
      const updated = await this.repo.update(id, data);
      console.log(' update success');
      return updated;
    } catch (error) {
      console.error('SERVICE UPDATE ERROR:', error);
      logError('Product update failed', { id, vendorId, error: error.message });
      throw error;
    }
  }

  async delete(id, vendorId) {
    try {
      console.log(' delete id:', id, 'vendorId:', vendorId);
      
      if (!id) throw new AppError('Product ID is required', 400);
      
      const product = await this.repo.findById(id);
      if (!product) throw new AppError('Product not found', 404);
      if (product.restaurant.vendorId !== vendorId) {
        throw new AppError('Access denied', 403);
      }
      if (!product.restaurant.isActive) {
        throw new AppError('Restaurant is inactive', 400);
      }

      logInfo('Deleting product', { id });
      await this.repo.delete(id);
      console.log('delete success');
      return { success: true };
    } catch (error) {
      console.error('SERVICE DELETE ERROR:', error);
      logError('Product delete failed', { id, vendorId, error: error.message });
      throw error;
    }
  }

  async addDiscount(productId, discountData, vendorId) {
    try {
      console.log(' addDiscount productId:', productId, 'vendorId:', vendorId);
      
      if (!productId) throw new AppError('Product ID is required', 400);
      
      const product = await this.repo.findById(productId);
      if (!product) throw new AppError('Product not found', 404);
      if (product.restaurant.vendorId !== vendorId) {
        throw new AppError('Access denied', 403);
      }
      if (!product.restaurant.isActive) {
        throw new AppError('Restaurant is inactive', 400);
      }

      const updateData = {
        discountPercent: Number(discountData.discountPercent),
        discountExpiry: discountData.discountExpiry || null
      };

      logInfo('Adding discount', { productId, discountPercent: updateData.discountPercent });
      const updated = await this.repo.update(productId, updateData);
      console.log(' addDiscount success');
      return updated;
    } catch (error) {
      console.error('SERVICE ADD DISCOUNT ERROR:', error);
      logError('Add discount failed', { productId, vendorId, error: error.message });
      throw error;
    }
  }

  async removeDiscount(productId, vendorId) {
    try {
      console.log(' removeDiscount productId:', productId);
      
      if (!productId) throw new AppError('Product ID is required', 400);
      
      const product = await this.repo.findById(productId);
      if (!product) throw new AppError('Product not found', 404);
      if (product.restaurant.vendorId !== vendorId) {
        throw new AppError('Access denied', 403);
      }

      logInfo('Removing discount', { productId });
      const updated = await this.repo.update(productId, {
        discountPercent: null,
        discountExpiry: null
      });
      console.log('removeDiscount success');
      return updated;
    } catch (error) {
      console.error('SERVICE REMOVE DISCOUNT ERROR:', error);
      logError('Remove discount failed', { productId, vendorId, error: error.message });
      throw error;
    }
  }

  async updateDiscount(productId, discountData, vendorId) {
  
    return await this.addDiscount(productId, discountData, vendorId);
  }

  withDiscounts(product) {
    try {
      const hasDiscount = product.discountPercent > 0 && 
        (!product.discountExpiry || new Date(product.discountExpiry) > new Date());
      
      const finalPrice = hasDiscount 
        ? Number((product.price * (1 - product.discountPercent / 100)).toFixed(2))
        : product.price;

      return {
        ...product,
        finalPrice,
        originalPrice: product.originalPrice || product.price,
        hasDiscount,
        isDiscounted: hasDiscount
      };
    } catch (error) {
      console.error('withDiscounts error:', error);
      return product; // Fallback to original product
    }
  }
}
