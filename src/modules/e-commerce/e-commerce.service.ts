import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MedicineStatus,
  OrderPaymentMethod,
  OrderPaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { NOTIFICATION_JOB_TYPES } from '../notification/constants/notification.constants';
import { NotificationService } from '../notification/notification.service';
import { randomUUID } from 'crypto';
import {
  CHECKOUT_IDEMPOTENCY_TTL_SECONDS,
  GUEST_SESSION_TTL_SECONDS,
} from './constants/e-commerce.constants';
import { CartResponseDto } from './dto/cart-response.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { GuestSessionResponseDto } from './dto/guest-session-response.dto';
import { ListMedicinesQueryDto } from './dto/list-medicines-query.dto';
import { MedicineCategoryDto } from './dto/medicine-category.dto';
import { PaginatedMedicinesResponseDto } from './dto/paginated-medicines-response.dto';
import { AdminListOrdersQueryDto } from './dto/admin-list-orders-query.dto';
import { AdminPaginatedOrdersResponseDto } from './dto/admin-order-response.dto';
import { PaginatedOrdersResponseDto } from './dto/paginated-orders-response.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { TrackOrdersByPhoneQueryDto } from './dto/track-orders-by-phone-query.dto';
import { UpsertCartItemDto } from './dto/upsert-cart-item.dto';
import {
  CreateCategoryDto,
  CreateMedicineDto,
  PatientOrdersQueryDto,
  UpdateCategoryDto,
  UpdateDeliveryStatusDto,
  UpdateMedicineDto,
} from './dto/admin-catalog.dto';
import { ECommerceRepository } from './repositories/e-commerce.repository';
import { ECommerceStoreService } from './e-commerce-store.service';
import { CartState } from './types/cart.type';

@Injectable()
export class ECommerceService {
  constructor(
    private readonly ecommerceRepository: ECommerceRepository,
    private readonly ecommerceStore: ECommerceStoreService,
    private readonly notifications: NotificationService,
  ) {}

  async createGuestSession(
    userAgent?: string,
    ipAddress?: string,
  ): Promise<GuestSessionResponseDto> {
    const sessionId = randomUUID();
    const lastActivityAt = new Date();
    const expiresAt = new Date(
      lastActivityAt.getTime() + GUEST_SESSION_TTL_SECONDS * 1000,
    );

    const session = await this.ecommerceRepository.createGuestSession({
      sessionId,
      userAgent,
      ipAddress,
      lastActivityAt,
      expiresAt,
    });

    await this.ecommerceStore.setCart(
      session.sessionId,
      {
        items: {},
        updatedAt: new Date().toISOString(),
      },
      GUEST_SESSION_TTL_SECONDS,
    );

    return {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  async listCategories(): Promise<MedicineCategoryDto[]> {
    const categories = await this.ecommerceRepository.findCategories();

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      medicineCount: category.medicines.length,
    }));
  }

  async listMedicines(
    query: ListMedicinesQueryDto,
  ): Promise<PaginatedMedicinesResponseDto> {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    const [medicines, total] = await this.ecommerceRepository.findMedicines({
      categoryId: query.categoryId,
      search: query.search?.trim(),
      requiresPrescription: query.requiresPrescription,
      inStockOnly: query.inStockOnly ?? true,
      skip,
      take,
    });

    return {
      items: medicines.map((medicine) => ({
        id: medicine.id,
        categoryId: medicine.categoryId,
        categoryName: medicine.category.name,
        name: medicine.name,
        genericName: medicine.genericName,
        manufacturer: medicine.manufacturer,
        price: this.formatMoney(medicine.price),
        stockQuantity: medicine.stockQuantity,
        requiresPrescription: medicine.requiresPrescription,
        status: medicine.status,
      })),
      total,
      skip,
      take,
    };
  }

  async getCart(guestSessionId: string): Promise<CartResponseDto> {
    const session = await this.getValidGuestSession(guestSessionId);
    const cart = (await this.ecommerceStore.getCart(guestSessionId)) ?? {
      items: {},
      updatedAt: new Date().toISOString(),
    };

    return this.buildCartResponse(session.sessionId, session.expiresAt, cart);
  }

  async upsertCartItem(dto: UpsertCartItemDto): Promise<CartResponseDto> {
    const session = await this.getValidGuestSession(dto.guestSessionId);
    const medicine = (
      await this.ecommerceRepository.findMedicinesByIds([dto.medicineId])
    )[0];

    if (!medicine || medicine.status !== MedicineStatus.ACTIVE) {
      throw new NotFoundException('Medicine not found');
    }

    if (medicine.stockQuantity < dto.quantity) {
      throw new BadRequestException('Requested quantity exceeds stock');
    }

    const cart = ((await this.ecommerceStore.getCart(dto.guestSessionId)) ?? {
      items: {},
      updatedAt: new Date().toISOString(),
    }) as CartState;

    cart.items[dto.medicineId] = dto.quantity;
    cart.updatedAt = new Date().toISOString();

    await this.persistCart(session.sessionId, cart);

    return this.buildCartResponse(session.sessionId, session.expiresAt, cart);
  }

  async removeCartItem(
    guestSessionId: string,
    medicineId: string,
  ): Promise<CartResponseDto> {
    const session = await this.getValidGuestSession(guestSessionId);
    const cart = ((await this.ecommerceStore.getCart(guestSessionId)) ?? {
      items: {},
      updatedAt: new Date().toISOString(),
    }) as CartState;

    delete cart.items[medicineId];
    cart.updatedAt = new Date().toISOString();

    await this.persistCart(session.sessionId, cart);

    return this.buildCartResponse(session.sessionId, session.expiresAt, cart);
  }

  async checkout(
    dto: CheckoutDto,
    user?: JwtRequestUser | null,
  ): Promise<OrderResponseDto> {
    const cachedOrder = await this.ecommerceStore.getIdempotency<OrderResponseDto>(
      'medicine-checkout',
      dto.idempotencyKey,
    );
    if (cachedOrder) {
      return cachedOrder;
    }

    const session = await this.getValidGuestSession(dto.guestSessionId);
    const cart = await this.ecommerceStore.getCart(dto.guestSessionId);

    if (!cart || Object.keys(cart.items).length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const medicines = await this.ecommerceRepository.findMedicinesByIds(
      Object.keys(cart.items),
    );
    const medicineMap = new Map(medicines.map((medicine) => [medicine.id, medicine]));

    const orderItems = Object.entries(cart.items).map(([medicineId, quantity]) => {
      const medicine = medicineMap.get(medicineId);
      if (!medicine || medicine.status !== MedicineStatus.ACTIVE) {
        throw new NotFoundException(`Medicine ${medicineId} not found`);
      }
      if (medicine.stockQuantity < quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${medicine.name}`,
        );
      }

      const unitPrice = new Prisma.Decimal(medicine.price);
      return {
        medicineId,
        medicineName: medicine.name,
        quantity,
        unitPrice,
        totalPrice: unitPrice.mul(quantity),
      };
    });

    const subtotal = orderItems.reduce(
      (sum, item) => sum.add(item.totalPrice),
      new Prisma.Decimal(0),
    );
    const discountAmount = new Prisma.Decimal(0);
    const taxAmount = new Prisma.Decimal(0);
    const finalAmount = subtotal.add(taxAmount).sub(discountAmount);

    const order = await this.ecommerceRepository.checkoutOrder({
      guestSessionId: session.sessionId,
      userId: user?.role === UserRole.PATIENT ? user.id : null,
      paymentMethod: dto.paymentMethod,
      paymentStatus:
        dto.paymentMethod === OrderPaymentMethod.CASH
          ? OrderPaymentStatus.PENDING_CASH
          : OrderPaymentStatus.PENDING,
      deliveryAddress: dto.deliveryAddress.trim(),
      deliveryPhone: dto.deliveryPhone.trim(),
      totalAmount: subtotal,
      discountAmount,
      taxAmount,
      finalAmount,
      items: orderItems.map((item) => ({
        medicineId: item.medicineId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    });

    await this.ecommerceStore.deleteCart(dto.guestSessionId);

    const response = this.mapOrder(order);
    await this.ecommerceStore.setIdempotency(
      'medicine-checkout',
      dto.idempotencyKey,
      response,
      CHECKOUT_IDEMPOTENCY_TTL_SECONDS,
    );

    if (user?.email) {
      void this.notifications.enqueue(NOTIFICATION_JOB_TYPES.ORDER_STATUS, {
        userId: user.id,
        recipient: user.email,
        subject: 'Order placed',
        data: { orderId: order.id, deliveryStatus: order.deliveryStatus },
      });
    }

    return response;
  }

  async listMyOrders(user: JwtRequestUser, query: PatientOrdersQueryDto) {
    if (user.role !== UserRole.PATIENT) {
      throw new BadRequestException('Patients only');
    }
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const [orders, total] = await this.ecommerceRepository.listOrdersByUserId(
      user.id,
      skip,
      take,
    );
    return {
      items: orders.map((o) => this.mapOrder(o)),
      total,
      skip,
      take,
    };
  }

  async getMyOrder(
    user: JwtRequestUser,
    orderId: string,
  ): Promise<OrderResponseDto> {
    if (user.role !== UserRole.PATIENT) {
      throw new BadRequestException('Patients only');
    }

    const order = await this.ecommerceRepository.findOrderById(orderId);

    if (!order || order.userId !== user.id) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrder(order);
  }

  async listAdminOrders(
    query: AdminListOrdersQueryDto,
  ): Promise<AdminPaginatedOrdersResponseDto> {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const email = query.email?.trim();
    const phone = query.phone?.trim();

    const [orders, total] = await this.ecommerceRepository.listOrdersForAdmin({
      email: email || undefined,
      phone: phone || undefined,
      skip,
      take,
    });

    return {
      items: orders.map((order) => this.mapAdminOrder(order)),
      total,
      skip,
      take,
    };
  }

  async updateDeliveryStatus(orderId: string, dto: UpdateDeliveryStatusDto) {
    const order = await this.ecommerceRepository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const updated = await this.ecommerceRepository.updateOrderDeliveryStatus(
      orderId,
      dto.deliveryStatus,
    );
    return this.mapOrder(updated);
  }

  createCategory(dto: CreateCategoryDto) {
    return this.ecommerceRepository.createCategory(dto.name, dto.description);
  }

  updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.ecommerceRepository.updateCategory(id, dto);
  }

  createMedicine(dto: CreateMedicineDto) {
    return this.ecommerceRepository.createMedicine({
      categoryId: dto.categoryId,
      name: dto.name,
      genericName: dto.genericName,
      manufacturer: dto.manufacturer,
      price: new Prisma.Decimal(dto.price),
      stockQuantity: dto.stockQuantity,
      requiresPrescription: dto.requiresPrescription ?? false,
    });
  }

  updateMedicine(id: string, dto: UpdateMedicineDto) {
    return this.ecommerceRepository.updateMedicine(id, {
      ...(dto.price !== undefined && { price: new Prisma.Decimal(dto.price) }),
      ...(dto.stockQuantity !== undefined && {
        stockQuantity: dto.stockQuantity,
      }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
  }

  async getOrder(
    orderId: string,
    guestSessionId: string,
  ): Promise<OrderResponseDto> {
    await this.getValidGuestSession(guestSessionId);
    const order = await this.ecommerceRepository.findOrderById(orderId);

    if (!order || order.guestSessionId !== guestSessionId) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrder(order);
  }

  async trackOrdersByPhone(
    query: TrackOrdersByPhoneQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const deliveryPhone = query.deliveryPhone.trim();

    const [orders, total] =
      await this.ecommerceRepository.listOrdersByDeliveryPhone(
        deliveryPhone,
        skip,
        take,
      );

    return {
      items: orders.map((order) => this.mapOrder(order)),
      total,
      skip,
      take,
    };
  }

  private async getValidGuestSession(sessionId: string) {
    const session = await this.ecommerceRepository.findGuestSessionBySessionId(
      sessionId,
    );

    if (!session) {
      throw new NotFoundException('Guest session not found');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Guest session expired');
    }

    const refreshedExpiry = new Date(
      Date.now() + GUEST_SESSION_TTL_SECONDS * 1000,
    );
    await this.ecommerceRepository.touchGuestSession(
      session.sessionId,
      new Date(),
      refreshedExpiry,
    );

    return {
      ...session,
      expiresAt: refreshedExpiry,
    };
  }

  private async persistCart(sessionId: string, cart: CartState): Promise<void> {
    await this.ecommerceStore.setCart(
      sessionId,
      cart,
      GUEST_SESSION_TTL_SECONDS,
    );
  }

  private async buildCartResponse(
    sessionId: string,
    expiresAt: Date,
    cart: CartState,
  ): Promise<CartResponseDto> {
    const medicineIds = Object.keys(cart.items);
    const medicines =
      medicineIds.length > 0
        ? await this.ecommerceRepository.findMedicinesByIds(medicineIds)
        : [];
    const medicineMap = new Map(medicines.map((medicine) => [medicine.id, medicine]));

    const items = medicineIds
      .map((medicineId) => {
        const medicine = medicineMap.get(medicineId);
        if (!medicine) {
          return null;
        }

        const quantity = cart.items[medicineId];
        const unitPrice = new Prisma.Decimal(medicine.price);
        const totalPrice = unitPrice.mul(quantity);

        return {
          medicineId,
          medicineName: medicine.name,
          genericName: medicine.genericName,
          quantity,
          unitPrice,
          totalPrice,
          requiresPrescription: medicine.requiresPrescription,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const subtotal = items.reduce(
      (sum, item) => sum.add(item.totalPrice),
      new Prisma.Decimal(0),
    );

    return {
      guestSessionId: sessionId,
      items: items.map((item) => ({
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        genericName: item.genericName,
        quantity: item.quantity,
        unitPrice: this.formatMoney(item.unitPrice),
        totalPrice: this.formatMoney(item.totalPrice),
        requiresPrescription: item.requiresPrescription,
      })),
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: this.formatMoney(subtotal),
      expiresAt: expiresAt.toISOString(),
    };
  }

  private mapOrder(order: {
    id: string;
    userId: string | null;
    guestSessionId: string | null;
    totalAmount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    finalAmount: Prisma.Decimal;
    paymentMethod: string;
    paymentStatus: string;
    deliveryStatus: string;
    deliveryAddress: string;
    deliveryPhone: string;
    createdAt: Date;
    items: Array<{
      medicineId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      medicine: { name: string };
    }>;
  }): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      guestSessionId: order.guestSessionId,
      totalAmount: this.formatMoney(order.totalAmount),
      discountAmount: this.formatMoney(order.discountAmount),
      taxAmount: this.formatMoney(order.taxAmount),
      finalAmount: this.formatMoney(order.finalAmount),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      deliveryAddress: order.deliveryAddress,
      deliveryPhone: order.deliveryPhone,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        medicineId: item.medicineId,
        medicineName: item.medicine.name,
        quantity: item.quantity,
        unitPrice: this.formatMoney(item.unitPrice),
        totalPrice: this.formatMoney(item.totalPrice),
      })),
    };
  }

  private mapAdminOrder(order: {
    id: string;
    userId: string | null;
    guestSessionId: string | null;
    totalAmount: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    finalAmount: Prisma.Decimal;
    paymentMethod: string;
    paymentStatus: string;
    deliveryStatus: string;
    deliveryAddress: string;
    deliveryPhone: string;
    createdAt: Date;
    user: { email: string } | null;
    items: Array<{
      medicineId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      medicine: { name: string };
    }>;
  }) {
    return {
      ...this.mapOrder(order),
      customerEmail: order.user?.email ?? null,
    };
  }

  private formatMoney(value: Prisma.Decimal | string): string {
    const decimal =
      typeof value === 'string' ? new Prisma.Decimal(value) : value;
    return decimal.toFixed(2);
  }
}
