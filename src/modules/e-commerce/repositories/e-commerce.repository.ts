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
  }) {
    return this.prisma.medicine.findMany({
      where: {
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
      },
      include: {
        category: true,
      },
      orderBy: [{ stockQuantity: 'desc' }, { name: 'asc' }],
    });
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
}
