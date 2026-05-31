import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('patient')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Patient dashboard aggregate' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  patient(@CurrentUser() user: JwtRequestUser) {
    return this.svc.patientDashboard(user);
  }

  @Get('doctor')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Doctor dashboard aggregate' })
  @ApiOkResponse()
  doctor(@CurrentUser() user: JwtRequestUser) {
    return this.svc.doctorDashboard(user);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin operations dashboard' })
  @ApiOkResponse()
  admin() {
    return this.svc.adminDashboard();
  }
}
