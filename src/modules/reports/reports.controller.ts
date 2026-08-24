import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { REPORTS_SWAGGER_TAG } from './constants/reports.constants';
import {
  DateRangeQueryDto,
  PaginatedReportQueryDto,
  RevenueQueryDto,
} from './dto/reports-query.dto';
import { ReportsService } from './reports.service';

@ApiTags(REPORTS_SWAGGER_TAG)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Revenue report grouped by entity and status' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async revenue(@Query() query: RevenueQueryDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.reports.revenue(query);
    if ('csv' in result) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="revenue.csv"');
      return result.csv;
    }
    return result;
  }

  @Get('operations')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Operational status counts across domains' })
  @ApiOkResponse()
  async operations(@Query() query: DateRangeQueryDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.reports.operations(query);
    if ('csv' in result) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="operations.csv"');
      return result.csv;
    }
    return result;
  }

  @Get('doctors')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Doctor performance report' })
  @ApiOkResponse()
  doctors(@Query() query: PaginatedReportQueryDto) {
    return this.reports.doctors(query);
  }

  @Get('top-medicines')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Top medicines by revenue' })
  @ApiOkResponse()
  topMedicines(@Query() query: PaginatedReportQueryDto) {
    return this.reports.topMedicines(query);
  }

  @Get('top-tests')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Top lab tests by booking count' })
  @ApiOkResponse()
  topTests(@Query() query: PaginatedReportQueryDto) {
    return this.reports.topTests(query);
  }
}
