import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { TELEHEALTH_SWAGGER_TAG } from './constants/telehealth.constants';
import {
  AdminTelehealthQueryDto,
  CancelTelehealthDto,
  CreateTelehealthRequestDto,
  PatientTelehealthQueryDto,
  SetPresenceDto,
} from './dto/telehealth-request.dto';
import {
  DoctorPresenceResponseDto,
  JoinTelehealthResponseDto,
  TelehealthRequestResponseDto,
} from './dto/telehealth-response.dto';
import { TelehealthService } from './telehealth.service';

@ApiTags(TELEHEALTH_SWAGGER_TAG)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('telehealth')
export class TelehealthController {
  constructor(private readonly telehealth: TelehealthService) {}

  @Post('requests')
  @Roles(UserRole.PATIENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request emergency telehealth consultation' })
  @ApiCreatedResponse({ type: TelehealthRequestResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  createRequest(
    @CurrentUser() user: JwtRequestUser,
    @Body() dto: CreateTelehealthRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.telehealth.createRequest(user, dto, idempotencyKey);
  }

  @Get('requests/me')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'List my telehealth requests' })
  @ApiOkResponse({ type: [TelehealthRequestResponseDto] })
  listMyRequests(
    @CurrentUser() user: JwtRequestUser,
    @Query() query: PatientTelehealthQueryDto,
  ) {
    return this.telehealth.listMyRequests(user, query);
  }

  @Get('requests/:id')
  @Roles(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get telehealth request detail' })
  @ApiOkResponse({ type: TelehealthRequestResponseDto })
  @ApiNotFoundResponse()
  getRequest(@Param('id') id: string, @CurrentUser() user: JwtRequestUser) {
    return this.telehealth.getRequest(id, user);
  }

  @Patch('requests/:id/cancel')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Cancel telehealth request' })
  @ApiOkResponse({ type: TelehealthRequestResponseDto })
  cancelRequest(
    @Param('id') id: string,
    @CurrentUser() user: JwtRequestUser,
    @Body() dto: CancelTelehealthDto,
  ) {
    return this.telehealth.cancelRequest(id, user, dto);
  }

  @Post('requests/:id/join')
  @Roles(UserRole.PATIENT, UserRole.DOCTOR)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Join telehealth video session' })
  @ApiOkResponse({ type: JoinTelehealthResponseDto })
  joinCall(@Param('id') id: string, @CurrentUser() user: JwtRequestUser) {
    return this.telehealth.joinCall(id, user);
  }

  @Put('doctor/presence')
  @Roles(UserRole.DOCTOR)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Set telehealth presence (ONLINE/BUSY/OFFLINE) and heartbeat' })
  @ApiOkResponse({ type: DoctorPresenceResponseDto })
  setPresence(@CurrentUser() user: JwtRequestUser, @Body() dto: SetPresenceDto) {
    return this.telehealth.setPresence(user, dto);
  }

  @Get('doctor/presence')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Get current telehealth presence' })
  @ApiOkResponse({ type: DoctorPresenceResponseDto })
  getPresence(@CurrentUser() user: JwtRequestUser) {
    return this.telehealth.getPresence(user);
  }

  @Get('doctor/inbox')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'List pending telehealth offers for doctor' })
  @ApiOkResponse({ type: [TelehealthRequestResponseDto] })
  doctorInbox(@CurrentUser() user: JwtRequestUser) {
    return this.telehealth.doctorInbox(user);
  }

  @Post('requests/:id/accept')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Accept telehealth offer' })
  @ApiOkResponse({ type: TelehealthRequestResponseDto })
  @ApiConflictResponse()
  acceptOffer(@Param('id') id: string, @CurrentUser() user: JwtRequestUser) {
    return this.telehealth.acceptOffer(id, user);
  }

  @Post('requests/:id/decline')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Decline telehealth offer' })
  @ApiOkResponse({ type: TelehealthRequestResponseDto })
  declineOffer(@Param('id') id: string, @CurrentUser() user: JwtRequestUser) {
    return this.telehealth.declineOffer(id, user);
  }

  @Patch('requests/:id/complete')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Complete telehealth session' })
  @ApiOkResponse({ type: TelehealthRequestResponseDto })
  completeSession(@Param('id') id: string, @CurrentUser() user: JwtRequestUser) {
    return this.telehealth.completeSession(id, user);
  }

  @Get('admin/requests')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin list telehealth requests' })
  adminList(@Query() query: AdminTelehealthQueryDto) {
    return this.telehealth.adminList(query);
  }
}
