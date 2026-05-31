import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { UpdateNotificationPreferenceDto } from './dto/notification-preference.dto';
import { NotificationLogQueryDto } from './dto/notification-log-query.dto';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  getPreferences(@CurrentUser() user: JwtRequestUser) {
    return this.svc.getPreferences(user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiOkResponse()
  updatePreferences(
    @CurrentUser() user: JwtRequestUser,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.svc.updatePreferences(user.id, dto);
  }

  @Get('logs')
  @ApiOperation({ summary: 'List notification delivery logs for current user' })
  @ApiOkResponse()
  listLogs(
    @CurrentUser() user: JwtRequestUser,
    @Query() query: NotificationLogQueryDto,
  ) {
    return this.svc.listLogs(user.id, query);
  }
}
