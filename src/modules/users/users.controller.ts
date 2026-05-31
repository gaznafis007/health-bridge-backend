import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  getMe(@CurrentUser() user: JwtRequestUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user basic fields' })
  @ApiOkResponse()
  updateMe(@CurrentUser() user: JwtRequestUser, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Patch('me/patient-profile')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Update patient profile' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  updatePatientProfile(
    @CurrentUser() user: JwtRequestUser,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.usersService.updatePatientProfile(user.id, dto);
  }

  @Patch('me/doctor-profile')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Update doctor profile (non-status fields)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  updateDoctorProfile(
    @CurrentUser() user: JwtRequestUser,
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    return this.usersService.updateDoctorProfile(user.id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List users (admin)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  listUsers(@Query() query: UserListQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Patch(':userId/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign user role (admin)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  assignRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(userId, dto);
  }

  @Patch(':userId/doctor/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve doctor profile (admin)' })
  @ApiOkResponse()
  approveDoctor(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.usersService.approveDoctor(userId);
  }

  @Patch(':userId/doctor/suspend')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Suspend doctor profile (admin)' })
  @ApiOkResponse()
  suspendDoctor(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.usersService.suspendDoctor(userId);
  }
}
