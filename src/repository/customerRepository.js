import prisma from '../config/db.js';
import { AppError } from '../utils/error.js';
import { logError } from '../utils/logger.js';

export class CustomerRepository {
  async createCustomer(data) {
    try {
      return await prisma.user.create({
        data: {
          ...data,
          role: 'CUSTOMER',
          isEmailVerified: false,
          isActive: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          createdAt: true
        }
      });
    } catch (error) {
      logError('CustomerRepository.createCustomer failed', { error: error.message });
      throw new AppError('Failed to create customer', 500);
    }
  }

  async findByEmail(email) {
    if (!email) throw new AppError('Email is required', 400);
    
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        isActive: true
      }
    });
  }

  async findRestaurants({ skip, take, where = {} } = {}) {
    try {
      const safeSkip = Math.max(0, Number(skip || 0));
      const safeTake = Math.min(50, Math.max(1, Number(take || 10)));

      const safeWhere = {
        isActive: true,
        ...(where.city && {
          city: { contains: where.city, mode: 'insensitive' }
        }),
        ...(where.search && {
          OR: [
            { name: { contains: where.search, mode: 'insensitive' } },
            { description: { contains: where.search, mode: 'insensitive' } }
          ]
        })
      };

      const [restaurants, total] = await Promise.all([
        prisma.restaurant.findMany({
          where: safeWhere,
          skip: safeSkip,
          take: safeTake,
          orderBy: [
            { createdAt: 'desc' },
            { name: 'asc' }
          ],
          include: {
            vendor: {
              select: { id: true, email: true }
            },
            menuCategories: {
              select: {
                id: true,
                name: true,
                position: true
              },
              take: 5
            }
          }
        }),
        prisma.restaurant.count({ where: safeWhere })
      ]);

      return { 
        data: restaurants, 
        total,
        meta: { page: Math.floor(safeSkip / safeTake) + 1, limit: safeTake }
      };
    } catch (error) {
      logError('CustomerRepository.findRestaurants failed', { error: error.message });
      throw new AppError('Failed to fetch restaurants', 500);
    }
  }

  async findRestaurantMenu(restaurantId) {
    if (!restaurantId) throw new AppError('Restaurant ID required', 400);
    
    try {
      return prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: {
          menuCategories: {
            select: {
              id: true,
              name: true,
              position: true
            },
            include: {
              products: {
                where: { isActive: true, isAvailable: true },
                select: {
                  id: true,
                  name: true,
                  price: true,
                  description: true,
                  image: true
                },
                orderBy: { position: 'asc' }
              }
            }
          }
        }
      });
    } catch (error) {
      logError('CustomerRepository.findRestaurantMenu failed', error);
      throw new AppError('Failed to fetch restaurant menu', 500);
    }
  }

  // 🔥 FIXED: Matches your NEW schema exactly
  async addToCart(userId, productId, quantity) {
    if (!userId || !productId) {
      throw new AppError('User ID and Product ID required', 400);
    }

    try {
      // Verify product exists and is available
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, isActive: true, isAvailable: true }
      });

      if (!product || !product.isActive || !product.isAvailable) {
        throw new AppError('Product not available', 404);
      }

      return await prisma.cartItem.upsert({
        where: { 
          userId_productId: {  // ← FIXED: Matches schema @@unique name
            userId, 
            productId 
          } 
        },
        update: { quantity: { increment: Number(quantity) } },
        create: { 
          userId,        // ← FIXED: Not customerId
          productId,     // ← FIXED: Not foodId
          quantity: Number(quantity) 
        },
        include: {
          product: {     // ← FIXED: Not food
            select: { id: true, name: true, price: true }
          }
        }
      });
    } catch (error) {
      console.error('🛒 addToCart PRISMA ERROR:', {
        error: error.message,
        code: error.code,
        userId,
        productId,
        quantity
      });
      
      if (error.code === 'P2025') {
        throw new AppError('Product not found', 404);
      }
      if (error.code === 'P2003') {
        throw new AppError('Invalid product reference', 400);
      }
      
      logError('CustomerRepository.addToCart failed', { 
        error: error.message, 
        code: error.code,
        userId, 
        productId 
      });
      throw new AppError('Failed to add item to cart', 500);
    }
  }

  async getCart(userId) {
    if (!userId) throw new AppError('User ID required', 400);
    
    try {
      return prisma.cartItem.findMany({
        where: { userId },  
        include: {
          product: {         
            select: {
              id: true,
              name: true,
              price: true
            }
          }
        },
       
      });
    } catch (error) {
      logError('CustomerRepository.getCart failed', error);
      throw new AppError('Failed to fetch cart', 500);
    }
  }

  async createOrder(userId, orderData) {
    return prisma.$transaction(async (tx) => {
      if (!userId || !orderData.restaurantId || !orderData.addressId) {
        throw new AppError('Missing required order data', 400);
      }

      const cartItems = await tx.cartItem.findMany({
        where: { userId },  // ← FIXED
        include: { product: { select: { id: true, name: true, price: true } } }  // ← FIXED
      });

      if (cartItems.length === 0) {
        throw new AppError('Cart is empty', 400);
      }

      const restaurant = await tx.restaurant.findFirst({
        where: { id: orderData.restaurantId, isActive: true }
      });
      if (!restaurant) throw new AppError('Restaurant unavailable', 400);

      const address = await tx.address.findFirst({
        where: { id: orderData.addressId }
      });
      if (!address) throw new AppError('Address not found', 400);

      const orderItemsData = cartItems.map(item => ({
        productId: item.productId,  // ← FIXED
        quantity: item.quantity,
        price: item.product.price
      }));

      const totalAmount = orderItemsData.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );

      const orderItems = await Promise.all(
        orderItemsData.map(item =>
          tx.orderItem.create({
            data: {
              productId: item.productId,  // ← FIXED
              quantity: item.quantity,
              price: item.price
            }
          })
        )
      );

      const order = await tx.order.create({
        data: {
          userId,
          restaurantId: orderData.restaurantId,
          addressId: orderData.addressId,
          totalAmount,
          status: 'PENDING',
          orderItems: {
            connect: orderItems.map(item => ({ id: item.id }))
          },
          payment: {
            create: {
              amount: totalAmount,
              method: orderData.paymentMethod || 'CASH',
              status: 'PENDING'
            }
          }
        },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          restaurant: { select: { name: true, phone: true } },
          address: true,
          payment: true,
          orderItems: {
            include: { product: { select: { name: true, price: true } } }  // ← FIXED
          }
        }
      });

      await tx.cartItem.deleteMany({ where: { userId } });  // ← FIXED
      return order;
    });
  }

  async getCustomerOrders(userId, { skip, take }) {
    try {
      const safeSkip = Number(skip || 0);
      const safeTake = Math.min(50, Number(take || 10));

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { userId },
          skip: safeSkip,
          take: safeTake,
          orderBy: { createdAt: 'desc' },
          include: {
            restaurant: { select: { name: true } },
            payment: true,
            orderItems: { include: { product: { select: { name: true } } } }  
          }
        }),
        prisma.order.count({ where: { userId } })
      ]);
      
      return { data: orders, total };
    } catch (error) {
      logError('CustomerRepository.getCustomerOrders failed', error);
      throw new AppError('Failed to fetch orders', 500);
    }
  }
}
