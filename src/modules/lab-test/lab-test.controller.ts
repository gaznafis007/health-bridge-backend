import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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
import { LabTestService } from './lab-test.service';
import { LAB_TEST_SWAGGER_TAG } from './constants/lab-test.constants';
import {
  AdminReportListQueryDto,
  BookingListQueryDto,
  CancelBookingDto,
  ConfirmPaymentDto,
  CreateBookingDto,
  CreateDiagnosticCenterDto,
  CreateLabTestDto,
  CreateTestPackageDto,
  TestSearchQueryDto,
  UpdateLabTestDto,
  UpdateTestPackageDto,
} from './dto/lab-test-request.dto';
import type { LabReportFile } from './types/lab-test.types';

// ─── Authenticated routes ────────────────────────────────────────────────────

@ApiTags(LAB_TEST_SWAGGER_TAG)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lab')
export class LabTestController {
  constructor(private readonly svc: LabTestService) {}

  // ── Diagnostic Centers ────────────────────────────────────────────────────

  @Get('centers')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all diagnostic centers' })
  @ApiOkResponse({ description: 'Sorted by name' })
  @ApiUnauthorizedResponse()
  listCenters() {
    return this.svc.listCenters();
  }

  @Post('centers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a diagnostic center (Admin)' })
  @ApiCreatedResponse()
  @ApiForbiddenResponse()
  createCenter(@Body() dto: CreateDiagnosticCenterDto) {
    return this.svc.createCenter(dto);
  }

  // ── Lab Tests ─────────────────────────────────────────────────────────────

  @Get('centers/:centerId/tests')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all tests for a center' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  listTests(@Param('centerId', ParseUUIDPipe) centerId: string) {
    return this.svc.listTests(centerId);
  }

  @Post('centers/:centerId/tests')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a lab test for a center (Admin)' })
  @ApiCreatedResponse()
  @ApiForbiddenResponse()
  createTest(
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Body() dto: CreateLabTestDto,
  ) {
    return this.svc.createTest(centerId, dto);
  }

  @Patch('tests/:testId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a lab test (Admin)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  updateTest(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Body() dto: UpdateLabTestDto,
  ) {
    return this.svc.updateTest(testId, dto);
  }

  @Get('tests/search')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Search lab tests across centers by name, code, or city' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  searchTests(@Query() query: TestSearchQueryDto) {
    return this.svc.searchTests(query);
  }

  // ── Test Packages ─────────────────────────────────────────────────────────

  @Get('centers/:centerId/packages')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all packages for a center' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  listPackages(@Param('centerId', ParseUUIDPipe) centerId: string) {
    return this.svc.listPackages(centerId);
  }

  @Post('centers/:centerId/packages')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a test package for a center (Admin)' })
  @ApiCreatedResponse()
  @ApiForbiddenResponse()
  createPackage(
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Body() dto: CreateTestPackageDto,
  ) {
    return this.svc.createPackage(centerId, dto);
  }

  @Patch('packages/:packageId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a test package (Admin)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  updatePackage(
    @Param('packageId', ParseUUIDPipe) packageId: string,
    @Body() dto: UpdateTestPackageDto,
  ) {
    return this.svc.updatePackage(packageId, dto);
  }

  // ── Bookings ──────────────────────────────────────────────────────────────

  @Post('bookings')
  @Roles(UserRole.PATIENT)
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a lab test booking (Patient)' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Client-generated UUID for idempotency',
    required: false,
  })
  @ApiCreatedResponse()
  @ApiUnauthorizedResponse()
  createBooking(
    @CurrentUser() user: JwtRequestUser,
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.svc.createBooking(user, dto, idempotencyKey);
  }

  @Get('bookings/me')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: "List authenticated patient's own bookings" })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  getMyBookings(
    @CurrentUser() user: JwtRequestUser,
    @Query() query: BookingListQueryDto,
  ) {
    return this.svc.getMyBookings(user, query);
  }

  @Get('bookings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all bookings (Admin)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  getAllBookings(@Query() query: BookingListQueryDto) {
    return this.svc.getAllBookings(query);
  }

  @Get('bookings/:bookingId')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get booking detail (Patient sees own; Admin sees all)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  getBookingDetail(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: JwtRequestUser,
  ) {
    return this.svc.getBookingDetail(bookingId, user);
  }

  @Patch('bookings/:bookingId/cancel')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  cancelBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: JwtRequestUser,
    @Body() dto: CancelBookingDto,
  ) {
    return this.svc.cancelBooking(bookingId, user, dto);
  }

  @Patch('bookings/:bookingId/payment/confirm')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Confirm advance payment for a booking (Admin)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  confirmPayment(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.svc.confirmPayment(bookingId, dto);
  }

  @Patch('bookings/:bookingId/sample/collect')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark sample as collected (Admin)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  sampleCollect(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.svc.updateSampleStatus(bookingId, 'COLLECTED' as any);
  }

  @Patch('bookings/:bookingId/sample/process')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark sample as processing (Admin)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  sampleProcess(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.svc.updateSampleStatus(bookingId, 'PROCESSING' as any);
  }

  @Patch('bookings/:bookingId/sample/complete')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark sample processing as complete (Admin)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  sampleComplete(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.svc.updateSampleStatus(bookingId, 'COMPLETED' as any);
  }

  @Post('bookings/:bookingId/reports')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a report PDF/image for a booking (Admin, multipart)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        testId: { type: 'string', format: 'uuid', nullable: true },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse()
  @ApiForbiddenResponse()
  uploadReport(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @UploadedFile() file: LabReportFile,
    @Body('testId') testId?: string,
  ) {
    return this.svc.uploadReport(bookingId, file, testId);
  }

  @Get('bookings/:bookingId/reports')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'List reports for a booking (auth-scoped)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  getReportsByBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: JwtRequestUser,
  ) {
    return this.svc.getReportsByBooking(bookingId, user);
  }

  @Get('reports')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all reports with filters (Admin)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  getAllReports(@Query() query: AdminReportListQueryDto) {
    return this.svc.getAllReports(query);
  }

  @Get('reports/me')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: "Patient's reports across all their bookings (dashboard)" })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  getMyReports(
    @CurrentUser() user: JwtRequestUser,
    @Query() query: BookingListQueryDto,
  ) {
    return this.svc.getMyReports(user, query);
  }

  @Patch('reports/:reportId/deliver')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deliver a report to patient via email (Admin)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  deliverReport(@Param('reportId', ParseUUIDPipe) reportId: string) {
    return this.svc.deliverReport(reportId);
  }
}

// ─── Public token route (no auth) ────────────────────────────────────────────

@ApiTags(LAB_TEST_SWAGGER_TAG)
@Controller('lab')
export class LabPublicController {
  constructor(private readonly svc: LabTestService) {}

  @Get('reports/token/:reportToken')
  @ApiOperation({ summary: 'Download report by anonymous token (no auth required)' })
  @ApiOkResponse({ description: 'Returns reportUrl and reportFileName' })
  getReportByToken(@Param('reportToken') reportToken: string) {
    return this.svc.getReportByToken(reportToken);
  }
}
