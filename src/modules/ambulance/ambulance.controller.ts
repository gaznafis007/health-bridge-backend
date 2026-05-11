import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { AmbulanceService } from './ambulance.service';
import { AMBULANCE_SWAGGER_TAG } from './constants/ambulance.constants';
import {
  BookingListQueryDto,
  CancelBookingDto,
  CreateBookingDto,
  CreateHealthCenterDto,
  FleetQueryDto,
  ManualDispatchDto,
  PushLocationDto,
  RegisterAmbulanceDto,
  RegisterDriverDto,
  StartShiftDto,
  UpdateAmbulanceStatusDto,
  UpdateDriverStatusDto,
} from './dto/ambulance-request.dto';

@ApiTags(AMBULANCE_SWAGGER_TAG)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ambulance')
export class AmbulanceController {
  constructor(private readonly svc: AmbulanceService) {}

  // ─── Health Centers ──────────────────────────────────────────────────────

  @Get('health-centers')
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'List all registered health centers' })
  @ApiOkResponse({ description: 'Sorted by name' })
  @ApiUnauthorizedResponse()
  listHealthCenters() {
    return this.svc.listHealthCenters();
  }

  @Post('health-centers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new health center' })
  @ApiCreatedResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  createHealthCenter(@Body() dto: CreateHealthCenterDto) {
    return this.svc.createHealthCenter(dto);
  }

  // ─── Fleet Management ────────────────────────────────────────────────────

  @Get('fleet')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'List ambulances with optional filters' })
  @ApiOkResponse({ description: 'Ambulances with their active shift info' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listFleet(@Query() query: FleetQueryDto) {
    return this.svc.listFleet(query);
  }

  @Post('fleet')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new ambulance under a health center' })
  @ApiCreatedResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  registerAmbulance(@Body() dto: RegisterAmbulanceDto) {
    return this.svc.registerAmbulance(dto);
  }

  @Patch('fleet/:ambulanceId/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update ambulance service status' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  updateAmbulanceStatus(
    @Param('ambulanceId', ParseUUIDPipe) ambulanceId: string,
    @Body() dto: UpdateAmbulanceStatusDto,
  ) {
    return this.svc.updateAmbulanceStatus(ambulanceId, dto);
  }

  // ─── Driver Management ───────────────────────────────────────────────────

  @Get('drivers')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'List driver profiles' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listDrivers(@Query('healthCenterId') healthCenterId?: string) {
    return this.svc.listDrivers({ healthCenterId });
  }

  @Post('drivers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new driver profile (user must have DRIVER role)' })
  @ApiCreatedResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  registerDriver(@Body() dto: RegisterDriverDto) {
    return this.svc.registerDriver(dto);
  }

  @Patch('drivers/:driverId/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update driver status (activate, suspend, etc.)' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  updateDriverStatus(
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Body() dto: UpdateDriverStatusDto,
  ) {
    return this.svc.updateDriverStatus(driverId, dto);
  }

  @Patch('drivers/:driverId/verify')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark driver as KYC-verified' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  verifyDriver(@Param('driverId', ParseUUIDPipe) driverId: string) {
    return this.svc.verifyDriver(driverId);
  }

  // ─── Shift Management ────────────────────────────────────────────────────

  @Post('shifts')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Start a driver shift (assigns driver to ambulance)' })
  @ApiCreatedResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  startShift(@Body() dto: StartShiftDto) {
    return this.svc.startShift(dto);
  }

  @Patch('shifts/:shiftId/end')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'End a driver shift' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  endShift(@Param('shiftId', ParseUUIDPipe) shiftId: string) {
    return this.svc.endShift(shiftId);
  }

  // ─── Bookings: Patient ───────────────────────────────────────────────────

  @Post('bookings')
  @Roles(UserRole.PATIENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request an emergency ambulance' })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Client-generated UUID to prevent duplicate bookings' })
  @ApiCreatedResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  createBooking(
    @CurrentUser() user: JwtRequestUser,
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.svc.createBooking(user, dto, idempotencyKey);
  }

  @Get('bookings/me')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'List my ambulance bookings (patient)' })
  @ApiOkResponse({ description: 'Paginated list of patient bookings' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  myBookings(
    @CurrentUser() user: JwtRequestUser,
    @Query() query: BookingListQueryDto,
  ) {
    return this.svc.getPatientBookings(user, query);
  }

  // ─── Bookings: Ops Queue ─────────────────────────────────────────────────

  @Get('bookings/active')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Active dispatch queue (non-terminal bookings, oldest first)' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  activeQueue(
    @Query() query: BookingListQueryDto,
  ) {
    return this.svc.getActiveQueue({ skip: query.skip ?? 0, take: query.take ?? 20 });
  }

  // ─── Booking Detail (shared) ─────────────────────────────────────────────

  @Get('bookings/:bookingId')
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Get booking details (role-scoped access)' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  getBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: JwtRequestUser,
  ) {
    return this.svc.getBookingDetail(bookingId, user);
  }

  @Patch('bookings/:bookingId/cancel')
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  cancelBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: JwtRequestUser,
    @Body() dto: CancelBookingDto,
  ) {
    return this.svc.cancelBooking(bookingId, user, dto);
  }

  // ─── Dispatch (Ops) ──────────────────────────────────────────────────────

  @Patch('bookings/:bookingId/dispatch')
  @Roles(UserRole.ADMIN, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Manually assign an ambulance and driver to a booking' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  manualDispatch(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() dispatcher: JwtRequestUser,
    @Body() dto: ManualDispatchDto,
  ) {
    return this.svc.manualDispatch(bookingId, dispatcher, dto);
  }

  // ─── Driver Lifecycle ────────────────────────────────────────────────────

  @Patch('bookings/:bookingId/arrive')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver marks arrival at pickup location' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  markArrived(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() driver: JwtRequestUser,
  ) {
    return this.svc.driverArrive(bookingId, driver);
  }

  @Patch('bookings/:bookingId/start')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver starts transit (patient on board)' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  startTransit(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() driver: JwtRequestUser,
  ) {
    return this.svc.driverStartTransit(bookingId, driver);
  }

  @Patch('bookings/:bookingId/complete')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver completes the trip (triggers payment finalization)' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  completTrip(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() driver: JwtRequestUser,
  ) {
    return this.svc.driverComplete(bookingId, driver);
  }

  // ─── Live Location ───────────────────────────────────────────────────────

  @Post('bookings/:bookingId/location')
  @Roles(UserRole.DRIVER)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Push driver heartbeat location (dual-write Redis + DB)' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  pushLocation(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() driver: JwtRequestUser,
    @Body() dto: PushLocationDto,
  ) {
    return this.svc.pushLocation(bookingId, driver, dto);
  }

  @Get('bookings/:bookingId/location')
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER)
  @ApiOperation({ summary: 'Get latest location for a booking (Redis cache → DB fallback)' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  getLiveLocation(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: JwtRequestUser,
  ) {
    return this.svc.getLiveLocation(bookingId, user);
  }

  @Get('bookings/:bookingId/location/trail')
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.DISPATCHER)
  @ApiOperation({ summary: 'Get full location trail for a booking (DB)' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  getTrail(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: JwtRequestUser,
  ) {
    return this.svc.getLocationTrail(bookingId, user);
  }
}
