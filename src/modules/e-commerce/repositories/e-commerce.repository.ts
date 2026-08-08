import { Injectable } from '@nestjs/common';
import {
  DeliveryStatus,
  MedicineStatus,
  OrderPaymentMethod,
  OrderPaymentStatus,
  Prisma,
  StockLogAction,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

type CreateOrderInput = {
  guestSessionId: string;
  userId?: string | null;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  deliveryAddress: string;
  deliveryPhone: string;
  totalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  finalAmount: Prisma.Decimal;
  items: Array<{
    medicineId: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    totalPrice: Prisma.Decimal;
  }>;
};

@Injectable()
export class ECommerceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCategories() {
    return this.prisma.medicineCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        medicines: {
          where: { status: MedicineStatus.ACTIVE },
          select: { id: true },
        },
      },
    });
  }

  findMedicines(filters: {
    categoryId?: string;
    search?: string;
    requiresPrescription?: boolean;
    inStockOnly: boolean;
    skip: number;
    take: number;
  }) {
    const where = this.buildMedicineWhere(filters);

    return Promise.all([
      this.prisma.medicine.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: [{ stockQuantity: 'desc' }, { name: 'asc' }],
        skip: filters.skip,
        take: filters.take,
      }),
      this.prisma.medicine.count({ where }),
    ]);
  }

  private buildMedicineWhere(filters: {
    categoryId?: string;
    search?: string;
    requiresPrescription?: boolean;
    inStockOnly: boolean;
  }): Prisma.MedicineWhereInput {
    return {
      status: MedicineStatus.ACTIVE,
      categoryId: filters.categoryId,
      requiresPrescription: filters.requiresPrescription,
      ...(filters.inStockOnly ? { stockQuantity: { gt: 0 } } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              {
                genericName: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                manufacturer: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
  }

  createGuestSession(data: {
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
    lastActivityAt: Date;
    expiresAt: Date;
  }) {
    return this.prisma.guestSession.create({ data });
  }

  findGuestSessionBySessionId(sessionId: string) {
    return this.prisma.guestSession.findUnique({
      where: { sessionId },
    });
  }

  touchGuestSession(sessionId: string, lastActivityAt: Date, expiresAt: Date) {
    return this.prisma.guestSession.update({
      where: { sessionId },
      data: {
        lastActivityAt,
        expiresAt,
      },
    });
  }

  findMedicinesByIds(
    medicineIds: string[],
    prisma: PrismaExecutor = this.prisma,
  ) {
    return prisma.medicine.findMany({
      where: {
        id: { in: medicineIds },
      },
      include: {
        category: true,
      },
    });
  }

  findOrderById(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });
  }

  checkoutOrder(input: CreateOrderInput) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          guestSessionId: input.guestSessionId,
          userId: input.userId ?? null,
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentStatus,
          deliveryStatus: DeliveryStatus.PENDING,
          deliveryAddress: input.deliveryAddress,
          deliveryPhone: input.deliveryPhone,
          totalAmount: input.totalAmount,
          discountAmount: input.discountAmount,
          taxAmount: input.taxAmount,
          finalAmount: input.finalAmount,
          items: {
            create: input.items.map((item) => ({
              medicineId: item.medicineId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: {
          items: {
            include: {
              medicine: true,
            },
          },
        },
      });

      const medicines = await this.findMedicinesByIds(
        input.items.map((item) => item.medicineId),
        tx,
      );
      const medicineMap = new Map(medicines.map((medicine) => [medicine.id, medicine]));

      for (const item of input.items) {
        const medicine = medicineMap.get(item.medicineId);
        if (!medicine) {
          continue;
        }

        await tx.medicine.update({
          where: { id: item.medicineId },
          data: {
            stockQuantity: medicine.stockQuantity - item.quantity,
            status:
              medicine.stockQuantity - item.quantity > 0
                ? medicine.status
                : MedicineStatus.OUT_OF_STOCK,
          },
        });

        await tx.stockLog.create({
          data: {
            medicineId: item.medicineId,
            action: StockLogAction.SALE,
            quantityChanged: -item.quantity,
            balanceBefore: medicine.stockQuantity,
            balanceAfter: medicine.stockQuantity - item.quantity,
            reason: 'Guest medicine checkout',
            reference: order.id,
          },
        });
      }

      return order;
    });
  }

  createCategory(name: string, description?: string) {
    return this.prisma.medicineCategory.create({
      data: { name, description },
    });
  }

  updateCategory(id: string, data: { name?: string; description?: string }) {
    return this.prisma.medicineCategory.update({ where: { id }, data });
  }

  createMedicine(data: {
    categoryId: string;
    name: string;
    genericName?: string;
    manufacturer?: string;
    price: Prisma.Decimal;
    stockQuantity: number;
    requiresPrescription: boolean;
  }) {
    return this.prisma.medicine.create({
      data,
      include: { category: true },
    });
  }

  updateMedicine(
    id: string,
    data: {
      price?: Prisma.Decimal;
      stockQuantity?: number;
      status?: MedicineStatus;
    },
  ) {
    return this.prisma.medicine.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  updateOrderDeliveryStatus(orderId: string, deliveryStatus: DeliveryStatus) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { deliveryStatus },
      include: {
        items: { include: { medicine: true } },
      },
    });
  }

  listOrdersByUserId(userId: string, skip: number, take: number) {
    return Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { items: { include: { medicine: true } } },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
  }

  listOrdersByDeliveryPhone(deliveryPhone: string, skip: number, take: number) {
    return Promise.all([
      this.prisma.order.findMany({
        where: { deliveryPhone },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { items: { include: { medicine: true } } },
      }),
      this.prisma.order.count({ where: { deliveryPhone } }),
    ]);
  }

  listOrdersForAdmin(filters: {
    email?: string;
    phone?: string;
    skip: number;
    take: number;
  }) {
    const where = this.buildAdminOrderWhere(filters);

    return Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filters.skip,
        take: filters.take,
        include: {
          items: { include: { medicine: true } },
          user: { select: { email: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
  }

  private buildAdminOrderWhere(filters: {
    email?: string;
    phone?: string;
  }): Prisma.OrderWhereInput {
    const conditions: Prisma.OrderWhereInput[] = [];

    if (filters.email) {
      conditions.push({
        user: {
          email: { contains: filters.email, mode: 'insensitive' },
        },
      });
    }

    if (filters.phone) {
      conditions.push({
        deliveryPhone: { contains: filters.phone },
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }
}
