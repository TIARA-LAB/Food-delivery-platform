import prisma from '../config/db.js';

export class ProductRepository {  
  async create(data) {
    return prisma.product.create({ 
      data: {
        ...data,
        position: data.position || await this.getNextPosition(data.restaurantId)
      },
      include: { 
        category: { select: { name: true } },
        restaurant: { select: { id: true, vendorId: true, name: true, isActive: true } }
      }
    });
  }

  async findById(id) {  
    return prisma.product.findUnique({
      where: { id },
      include: { 
        category: { select: { name: true } },
        restaurant: { select: { id: true, vendorId: true, name: true, isActive: true } }
      }
    });
  }

  async findMany({ skip, take, where = {} }) {  
    const [data, total] = await Promise.all([
      prisma.product.findMany({ 
        where: { isActive: true, isAvailable: true, ...where },
        skip, 
        take, 
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        include: { category: { select: { name: true } } }
      }),
      prisma.product.count({ where: { isActive: true, isAvailable: true, ...where } })
    ]);
    return { data, total };
  }

  async update(id, data) { 
    return prisma.product.update({ 
      where: { id }, 
      data,
      include: { 
        category: { select: { name: true } },
        restaurant: { select: { id: true, vendorId: true, name: true, isActive: true } }
      }
    });
  }

  async delete(id) { 
    return prisma.product.delete({ 
      where: { id } 
    });
  }

  async getNextPosition(restaurantId) {
    const last = await prisma.product.findFirst({
      where: { restaurantId },
      orderBy: { position: 'desc' }
    });
    return (last?.position || 0) + 1;
  }

  async validateRestaurantOwnership(restaurantId, vendorId) {
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
