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
      logError('CustomerRepository.createCustomer failed', error);
      throw new AppError('Failed to create customer', 500);
    }
  }

  async findByEmail(email) {
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

  async findRestaurants({ skip, take, where }) {
    try {
      const [restaurants, total] = await Promise.all([
        prisma.restaurant.findMany({
          where: { 
            isActive: true, 
            ...where 
          },
          skip: Number(skip),
          take: Number(take),
          orderBy: { 
            rating: 'desc', 
            createdAt: 'desc' 
          },
          include: {
            _count: { 
              select: { menuCategories: true } 
            }
          }
        }),
        prisma.restaurant.count({ 
          where: { 
            isActive: true, 
            ...where 
          } 
        })
      ]);
      return { restaurants, total };
    } catch (error) {
      logError('CustomerRepository.findRestaurants failed', error);
      throw new AppError('Failed to fetch restaurants', 500);
    }
  }

  async findRestaurantMenu(restaurantId) {
    try {
      return prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: {
          menuCategories: {
            include: {
              items: {
                where: { isAvailable: true },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  image: true
                }
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

  async addToCart(customerId, foodId, quantity) {
    try {
      return prisma.cartItem.upsert({
        where: { 
          customerId_foodId: { customerId, foodId } 
        },
        update: { 
          quantity: { 
            increment: Number(quantity) 
          } 
        },
        create: { 
          customerId, 
          foodId, 
          quantity: Number(quantity) 
        },
        include: {
          food: {
            select: { 
              id: true, 
              name: true, 
              price: true 
            }
          }
        }
      });
    } catch (error) {
      logError('CustomerRepository.addToCart failed', error);
      throw new AppError('Failed to add item to cart', 500);
    }
  }

  async getCart(customerId) {
    try {
      return prisma.cartItem.findMany({
        where: { customerId },
        include: {
          food: {
            select: {
              id: true,
              name: true,
              price: true,
              category: { 
                select: { name: true } 
              }
            }
          }
        },
        orderBy: { 
          createdAt: 'desc' 
        }
      });
    } catch (error) {
      logError('CustomerRepository.getCart failed', error);
      throw new AppError('Failed to fetch cart', 500);
    }
  }

  async createOrder(customerId, orderData) {
    return prisma.$transaction(async (tx) => {
      // Get cart items
      const cartItems = await tx.cartItem.findMany({
        where: { customerId },
        include: {
          food: {
            select: { 
              id: true, 
              name: true, 
              price: true 
            }
          }
        }
      });

      if (cartItems.length === 0) {
        throw new AppError('Cart is empty', 400);
      }

      // Verify restaurant
      const restaurant = await tx.restaurant.findFirst({
        where: { 
          id: orderData.restaurantId, 
          isActive: true 
        }
      });
      if (!restaurant) {
        throw new AppError('Restaurant unavailable', 400);
      }

      // Verify address
      const address = await tx.address.findFirst({
        where: { id: orderData.addressId }
      });
      if (!address) {
        throw new AppError('Address not found', 400);
      }

      // Create order items from cart
      const orderItems = cartItems.map(item => ({
        foodId: item.foodId,
        quantity: item.quantity,
        price: item.food.price
      }));

      const totalAmount = orderItems.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );

      // Create order
      const order = await tx.order.create({
        data: {
          userId: customerId,
          restaurantId: orderData.restaurantId,
          addressId: orderData.addressId,
          totalAmount,
          items: orderItems.map(item => ({
            foodId: item.foodId,
            quantity: item.quantity,
            price: item.price
          })),
          payment: {
            create: {
              amount: totalAmount,
              method: orderData.paymentMethod,
              status: 'PENDING'
            }
          }
        },
        include: {
          user: { 
            select: { 
              id: true, 
              name: true, 
              phone: true 
            } 
          },
          restaurant: { 
            select: { 
              name: true, 
              phone: true 
            } 
          },
          address: true,
          payment: true
        }
      });

      // Clear cart
      await tx.cartItem.deleteMany({ where: { customerId } });

      return order;
    });
  }

  async getCustomerOrders(customerId, { skip, take }) {
    try {
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { userId: customerId },
          skip: Number(skip),
          take: Number(take),
          orderBy: { createdAt: 'desc' },
          include: {
            restaurant: { 
              select: { name: true } 
            },
            payment: true
          }
        }),
        prisma.order.count({ where: { userId: customerId } })
      ]);
      return { orders, total };
    } catch (error) {
      logError('CustomerRepository.getCustomerOrders failed', error);
      throw new AppError('Failed to fetch orders', 500);
    }
  }
}
