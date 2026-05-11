import { ApiProperty } from '@nestjs/swagger';

export class HealthCenterBriefDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  zipCode!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  email!: string;
}

export class AppointmentSlotDto {
  @ApiProperty()
  availabilityRuleId!: string;

  @ApiProperty()
  healthCenterId!: string;

  @ApiProperty()
  startTime!: string;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty()
  available!: boolean;
}

export class AppointmentSlotGroupDto {
  @ApiProperty({ type: HealthCenterBriefDto })
  healthCenter!: HealthCenterBriefDto;

  @ApiProperty({ type: [AppointmentSlotDto] })
  slots!: AppointmentSlotDto[];
}

export class DoctorSearchHitDto {
  @ApiProperty()
  doctorUserId!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  specialization!: string;

  @ApiProperty()
  freeSlotCount!: number;
}
