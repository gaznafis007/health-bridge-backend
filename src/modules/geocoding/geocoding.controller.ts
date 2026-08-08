import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { GEOCODING_SWAGGER_TAG } from './constants/geocoding.constants';
import {
  GeocodingReverseQueryDto,
  GeocodingSearchQueryDto,
} from './dto/geocoding-query.dto';
import {
  GeocodingReverseResponseDto,
  GeocodingSearchResponseDto,
} from './dto/geocoding-response.dto';
import { GeocodingService } from './geocoding.service';

@ApiTags(GEOCODING_SWAGGER_TAG)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get('search')
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.DISPATCHER)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Search addresses for autocomplete' })
  @ApiOkResponse({ type: GeocodingSearchResponseDto })
  @ApiUnauthorizedResponse()
  async search(
    @Query() query: GeocodingSearchQueryDto,
    @CurrentUser() user: JwtRequestUser,
  ): Promise<GeocodingSearchResponseDto> {
    const results = await this.geocodingService.search(
      query.q,
      query.limit ?? 5,
      user.id,
    );
    return { results };
  }

  @Get('reverse')
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.DISPATCHER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reverse geocode coordinates to an address label' })
  @ApiOkResponse({ type: GeocodingReverseResponseDto })
  @ApiUnauthorizedResponse()
  async reverse(
    @Query() query: GeocodingReverseQueryDto,
    @CurrentUser() user: JwtRequestUser,
  ): Promise<GeocodingReverseResponseDto> {
    const result = await this.geocodingService.reverse(
      query.lat,
      query.lng,
      user.id,
    );
    return { result };
  }
}
