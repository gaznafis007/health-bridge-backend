import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CartResponseDto } from './dto/cart-response.dto';
import {
  CheckoutDto,
  checkoutSchema,
} from './dto/checkout.dto';
import {
  GetOrderQueryDto,
  getOrderQuerySchema,
} from './dto/get-order-query.dto';
import { GuestSessionResponseDto } from './dto/guest-session-response.dto';
import {
  ListMedicinesQueryDto,
  listMedicinesQuerySchema,
} from './dto/list-medicines-query.dto';
import { MedicineCategoryDto } from './dto/medicine-category.dto';
import { PaginatedMedicinesResponseDto } from './dto/paginated-medicines-response.dto';
import { PaginatedOrdersResponseDto } from './dto/paginated-orders-response.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import {
  TrackOrdersByPhoneQueryDto,
  trackOrdersByPhoneQuerySchema,
} from './dto/track-orders-by-phone-query.dto';
import {
  UpsertCartItemDto,
  upsertCartItemSchema,
} from './dto/upsert-cart-item.dto';
import {
  CreateCategoryDto,
  CreateMedicineDto,
  PatientOrdersQueryDto,
  UpdateCategoryDto,
  UpdateDeliveryStatusDto,
  UpdateMedicineDto,
} from './dto/admin-catalog.dto';
import {
  AdminListOrdersQueryDto,
  adminListOrdersQuerySchema,
} from './dto/admin-list-orders-query.dto';
import { AdminPaginatedOrdersResponseDto } from './dto/admin-order-response.dto';
import { ECommerceService } from './e-commerce.service';

@ApiTags('e-commerce')
@Controller('e-commerce')
export class ECommerceController {
  constructor(private readonly ecommerceService: ECommerceService) {}

  @Post('guest-sessions')
  @ApiOperation({ summary: 'Create a guest session for medicine commerce' })
  @ApiCreatedResponse({ type: GuestSessionResponseDto })
  @ApiBadRequestResponse({ description: 'Unable to create guest session' })
  createGuestSession(
    @Req() req,
    @Ip() ip: string,
  ): Promise<GuestSessionResponseDto> {
    return this.ecommerceService.createGuestSession(
      req.headers['user-agent'] as string | undefined,
      ip,
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'List medicine categories' })
  @ApiOkResponse({ type: [MedicineCategoryDto] })
  @ApiBadRequestResponse({ description: 'Invalid category request' })
  @ApiUnauthorizedResponse({ description: 'Not applicable for this public route' })
  listCategories(): Promise<MedicineCategoryDto[]> {
    return this.ecommerceService.listCategories();
  }

  @Get('medicines')
  @ApiOperation({ summary: 'Browse active medicines for guest or signed-in users' })
  @ApiOkResponse({ type: PaginatedMedicinesResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid medicine filters' })
  @ApiUnauthorizedResponse({ description: 'Not applicable for this public route' })
  listMedicines(
    @Query(new ZodValidationPipe(listMedicinesQuerySchema))
    query: ListMedicinesQueryDto,
  ): Promise<PaginatedMedicinesResponseDto> {
    return this.ecommerceService.listMedicines(query);
  }

  @Get('cart/:guestSessionId')
  @ApiOperation({ summary: 'Get guest medicine cart' })
  @ApiParam({ name: 'guestSessionId', format: 'uuid' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiBadRequestResponse({ description: 'Expired session or invalid cart state' })
  @ApiNotFoundResponse({ description: 'Guest session not found' })
  @ApiUnauthorizedResponse({ description: 'Not applicable for this public route' })
  getCart(
    @Param('guestSessionId', new ParseUUIDPipe()) guestSessionId: string,
  ): Promise<CartResponseDto> {
    return this.ecommerceService.getCart(guestSessionId);
  }

  @Put('cart/items')
  @ApiOperation({ summary: 'Add or replace a medicine item in guest cart' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiBadRequestResponse({ description: 'Quantity exceeds stock or request is invalid' })
  @ApiNotFoundResponse({ description: 'Guest session or medicine not found' })
  @ApiUnauthorizedResponse({ description: 'Not applicable for this public route' })
  upsertCartItem(
    @Body(new ZodValidationPipe(upsertCartItemSchema)) dto: UpsertCartItemDto,
  ): Promise<CartResponseDto> {
    return this.ecommerceService.upsertCartItem(dto);
  }

  @Delete('cart/items/:guestSessionId/:medicineId')
  @ApiOperation({ summary: 'Remove a medicine item from guest cart' })
  @ApiParam({ name: 'guestSessionId', format: 'uuid' })
  @ApiParam({ name: 'medicineId', format: 'uuid' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid guest session or medicine id' })
  @ApiNotFoundResponse({ description: 'Guest session not found' })
  @ApiUnauthorizedResponse({ description: 'Not applicable for this public route' })
  removeCartItem(
    @Param('guestSessionId', new ParseUUIDPipe()) guestSessionId: string,
    @Param('medicineId', new ParseUUIDPipe()) medicineId: string,
  ): Promise<CartResponseDto> {
    return this.ecommerceService.removeCartItem(guestSessionId, medicineId);
  }

  @Post('checkout')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Checkout guest medicine cart into an order' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Empty cart, invalid delivery input, or insufficient stock' })
  @ApiNotFoundResponse({ description: 'Guest session or medicine not found' })
  checkout(
    @Body(new ZodValidationPipe(checkoutSchema)) dto: CheckoutDto,
    @CurrentUser() user: JwtRequestUser | null,
  ): Promise<OrderResponseDto> {
    return this.ecommerceService.checkout(dto, user);
  }

  @Get('orders/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List medicine orders for authenticated patient' })
  @ApiOkResponse({ type: PaginatedOrdersResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  myOrders(
    @CurrentUser() user: JwtRequestUser,
    @Query() query: PatientOrdersQueryDto,
  ) {
    return this.ecommerceService.listMyOrders(user, query);
  }

  @Get('orders/me/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a medicine order detail for authenticated patient' })
  @ApiParam({ name: 'orderId', format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse({ description: 'Order not found' })
  getMyOrder(
    @CurrentUser() user: JwtRequestUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ecommerceService.getMyOrder(user, orderId);
  }

  @Get('admin/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all medicine orders for admin with optional email or phone search',
  })
  @ApiQuery({ name: 'email', required: false, example: 'patient1@healthbridge.dev' })
  @ApiQuery({ name: 'phone', required: false, example: '+8801700' })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 20 })
  @ApiOkResponse({ type: AdminPaginatedOrdersResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid search or pagination parameters' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listAdminOrders(
    @Query(new ZodValidationPipe(adminListOrdersQuerySchema))
    query: AdminListOrdersQueryDto,
  ): Promise<AdminPaginatedOrdersResponseDto> {
    return this.ecommerceService.listAdminOrders(query);
  }

  @Patch('orders/:orderId/delivery-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order delivery status (admin)' })
  @ApiOkResponse({ type: OrderResponseDto })
  updateDeliveryStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.ecommerceService.updateDeliveryStatus(orderId, dto);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiCreatedResponse()
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.ecommerceService.createCategory(dto);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOkResponse()
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.ecommerceService.updateCategory(id, dto);
  }

  @Post('medicines')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiCreatedResponse()
  createMedicine(@Body() dto: CreateMedicineDto) {
    return this.ecommerceService.createMedicine(dto);
  }

  @Patch('medicines/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOkResponse()
  updateMedicine(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicineDto,
  ) {
    return this.ecommerceService.updateMedicine(id, dto);
  }

  @Get('orders/by-phone')
  @ApiOperation({
    summary: 'Track medicine orders by delivery phone number used at checkout',
  })
  @ApiQuery({ name: 'deliveryPhone', required: true, example: '+8801700000000' })
  @ApiQuery({ name: 'skip', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, example: 20 })
  @ApiOkResponse({ type: PaginatedOrdersResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid phone number or pagination' })
  @ApiUnauthorizedResponse({ description: 'Not applicable for this public route' })
  trackOrdersByPhone(
    @Query(new ZodValidationPipe(trackOrdersByPhoneQuerySchema))
    query: TrackOrdersByPhoneQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    return this.ecommerceService.trackOrdersByPhone(query);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Track a guest medicine order by order id and session' })
  @ApiParam({ name: 'orderId', format: 'uuid' })
  @ApiQuery({ name: 'guestSessionId', required: true, format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid guest session request' })
  @ApiNotFoundResponse({ description: 'Guest session or order not found' })
  @ApiUnauthorizedResponse({ description: 'Not applicable for this public route' })
  getOrder(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Query(new ZodValidationPipe(getOrderQuerySchema))
    query: GetOrderQueryDto,
  ): Promise<OrderResponseDto> {
    return this.ecommerceService.getOrder(orderId, query.guestSessionId);
  }
}
