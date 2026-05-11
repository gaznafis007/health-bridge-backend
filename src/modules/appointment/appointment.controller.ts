import {
  Body,
  Controller,
  Delete,
  Get,
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
  ApiNoContentResponse,
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
import { AppointmentService } from './appointment.service';
import { APPOINTMENTS_SWAGGER_TAG } from './constants/appointment.constants';
import {
  AppointmentListQueryDto,
  BookAppointmentDto,
  CreateAvailabilityDto,
  DoctorBookingDateQueryDto,
  DoctorScheduleQueryDto,
  SearchDoctorsQueryDto,
  UpdateAvailabilityDto,
} from './dto/appointment.dto';
import { DoctorSearchHitDto } from './dto/appointment-response.dto';

@ApiTags(APPOINTMENTS_SWAGGER_TAG)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly svc: AppointmentService) {}

  @Get('health-centers')
  @Roles(UserRole.PATIENT, UserRole.DOCTOR)
  @ApiOperation({
    summary: 'List registered health centres (doctor practice venues)',
    description:
      'Doctors attach availability to existing `HealthCenter` registry entries.',
  })
  @ApiOkResponse({ description: 'Centres sorted by name' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listHealthCentres() {
    return this.svc.listHealthCentres();
  }

  @Get('doctors/search')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary:
      'Search ACTIVE doctors (specialization + UTC date; optional health centre filter)',
  })
  @ApiOkResponse({ type: DoctorSearchHitDto, isArray: true })
  searchDoctors(
    @CurrentUser() user: JwtRequestUser,
    @Query() query: SearchDoctorsQueryDto,
  ) {
    return this.svc.searchDoctors(user, query);
  }

  @Get('doctors/:doctorUserId')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary:
      'Doctor booking preview: fee, doctor phone, centres, slots (UTC day); optional health centre filter',
  })
  doctorBookingDetail(
    @Param('doctorUserId', ParseUUIDPipe) doctorUserId: string,
    @Query() query: DoctorBookingDateQueryDto,
  ) {
    return this.svc.doctorBookingDetail(doctorUserId, query);
  }

  @Post()
  @Roles(UserRole.PATIENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiCreatedResponse()
  book(@CurrentUser() user: JwtRequestUser, @Body() dto: BookAppointmentDto) {
    return this.svc.book(user.id, dto);
  }

  @Get('me/patient')
  @Roles(UserRole.PATIENT)
  @ApiOkResponse({ description: 'Paginated appointments for current patient' })
  myPatientAppointments(
    @CurrentUser() user: JwtRequestUser,
    @Query() query: AppointmentListQueryDto,
  ) {
    return this.svc.listPatient(user, query);
  }

  @Get('me/doctor')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({
    summary:
      'Doctor appointments in a UTC-date range; optional filter by health centre',
    description:
      'Default: from=today UTC through today+7 calendar offsets (inclusive), upper bound exclusive.',
  })
  doctorSchedule(
    @CurrentUser() user: JwtRequestUser,
    @Query() query: DoctorScheduleQueryDto,
  ) {
    return this.svc.doctorSchedule(user, query);
  }

  @Get('me/doctor/availability')
  @Roles(UserRole.DOCTOR)
  @ApiOkResponse({
    description: 'Availability windows linked to HealthCenter rows',
  })
  listDoctorAvailability(@CurrentUser() user: JwtRequestUser) {
    return this.svc.listDoctorAvailability(user);
  }

  @Post('me/doctor/availability')
  @Roles(UserRole.DOCTOR)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiCreatedResponse()
  createDoctorAvailability(
    @CurrentUser() user: JwtRequestUser,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.svc.createDoctorAvailability(user.id, dto);
  }

  @Patch('me/doctor/availability/:availabilityId')
  @Roles(UserRole.DOCTOR)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOkResponse()
  patchDoctorAvailability(
    @CurrentUser() user: JwtRequestUser,
    @Param('availabilityId', ParseUUIDPipe) availabilityId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.svc.updateDoctorAvailability(user.id, availabilityId, dto);
  }

  @Delete('me/doctor/availability/:availabilityId')
  @Roles(UserRole.DOCTOR)
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  async deleteDoctorAvailability(
    @CurrentUser() user: JwtRequestUser,
    @Param('availabilityId', ParseUUIDPipe) availabilityId: string,
  ): Promise<void> {
    await this.svc.deleteDoctorAvailability(user.id, availabilityId);
  }
}
