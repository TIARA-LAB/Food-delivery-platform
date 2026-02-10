import prisma from '../config/db.js';
import { AppError } from '../utils/error.js';

export class ProductRepository {  
  async create(data) {
    const productData = {
      restaurantId: data.restaurantId,
      name: data.name,
      description: data.description || null,
      price: Number(data.price),
      originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
      discountPercent: data.discountPercent ? Number(data.discountPercent) : null,
      discountExpiry: data.discountExpiry || null,
      image: data.image || null,
      images: data.images || null,
      stockQuantity: Number(data.stockQuantity) || 9999,
      prepTimeMinutes: Number(data.prepTimeMinutes) || 15,
      isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : true,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      position: data.position || await this.getNextPosition(data.restaurantId)
    };

    return prisma.product.create({
      data: productData,
      include: {
        restaurant: {
          select: {
            id: true,
            vendorId: true,
            name: true,
            isActive: true
          }
        }
      }
    });
  }

  async findById(id) {
    if (!id || typeof id !== 'string') {
      throw new AppError('Product ID is required and must be a string', 400);
    }

    return prisma.product.findUnique({
      where: { id }, 
      include: {
        restaurant: {
          select: {
            id: true,
            vendorId: true,
            name: true,
            isActive: true
          }
        }
      }
    });
  }

  async findMany({ skip, take, where = {} }) {
    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
          isAvailable: true,
          ...where
        },
        skip: Number(skip),
        take: Number(take),
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        include: {
          restaurant: {
            select: {
              id: true,
              vendorId: true,
              name: true,
              isActive: true
            }
          }
        }
      }),
      prisma.product.count({
        where: {
          isActive: true,
          isAvailable: true,
          ...where
        }
      })
    ]);
    return { data, total };
  }

  async update(id, data) {
    if (!id || typeof id !== 'string') {
      throw new AppError('Product ID is required and must be a string', 400);
    }

    return prisma.product.update({
      where: { id },
      data,
      include: {
        restaurant: {
          select: {
            id: true,
            vendorId: true,
            name: true,
            isActive: true
          }
        }
      }
    });
  }

  async delete(id) {
    if (!id || typeof id !== 'string') {
      throw new AppError('Product ID is required and must be a string', 400);
    }

    return prisma.product.delete({
      where: { id }
    });
  }

  async getNextPosition(restaurantId) {
    if (!restaurantId || typeof restaurantId !== 'string') {
      throw new AppError('Restaurant ID is required', 400);
    }

    const last = await prisma.product.findFirst({
      where: { restaurantId },
      orderBy: { position: 'desc' }
    });
    return (last?.position || 0) + 1;
  }

  async validateRestaurantOwnership(restaurantId, vendorId) {
    if (!restaurantId || typeof restaurantId !== 'string') {
      throw new AppError('Restaurant ID is required', 400);
    }
    if (!vendorId || typeof vendorId !== 'string') {
      throw new AppError('Vendor ID is required', 400);
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { vendorId: true, isActive: true }
    });

    return {
      restaurant,
      hasAccess: restaurant?.vendorId === vendorId && restaurant?.isActive
    };
  }
}
