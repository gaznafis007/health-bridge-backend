import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
import { MedicineSummaryDto } from './dto/medicine-summary.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import {
  UpsertCartItemDto,
  upsertCartItemSchema,
} from './dto/upsert-cart-item.dto';
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
  @ApiOkResponse({ type: [MedicineSummaryDto] })
  @ApiBadRequestResponse({ description: 'Invalid medicine filters' })
  @ApiUnauthorizedResponse({ description: 'Not applicable for this public route' })
  listMedicines(
    @Query(new ZodValidationPipe(listMedicinesQuerySchema))
    query: ListMedicinesQueryDto,
  ): Promise<MedicineSummaryDto[]> {
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
  @ApiOperation({ summary: 'Checkout guest medicine cart into an order' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Empty cart, invalid delivery input, or insufficient stock' })
  @ApiNotFoundResponse({ description: 'Guest session or medicine not found' })
  @ApiUnauthorizedResponse({ description: 'Not applicable for this public route' })
  checkout(
    @Body(new ZodValidationPipe(checkoutSchema)) dto: CheckoutDto,
  ): Promise<OrderResponseDto> {
    return this.ecommerceService.checkout(dto);
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
