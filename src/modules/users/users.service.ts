import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DoctorStatus, UserRole } from '@prisma/client';
import type { JwtRequestUser } from '../../common/types/jwt-request-user';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { UsersRepository } from './repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async getMe(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapUser(user);
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.repo.updateUser(userId, dto);
    return this.mapUser(user);
  }

  async updatePatientProfile(userId: string, dto: UpdatePatientProfileDto) {
    const user = await this.repo.findById(userId);
    if (!user || user.role !== UserRole.PATIENT || !user.patientProfile) {
      throw new BadRequestException('Patient profile not found');
    }
    await this.repo.updatePatientProfile(userId, dto);
    return this.getMe(userId);
  }

  async updateDoctorProfile(userId: string, dto: UpdateDoctorProfileDto) {
    const user = await this.repo.findById(userId);
    if (!user || user.role !== UserRole.DOCTOR || !user.doctorProfile) {
      throw new BadRequestException('Doctor profile not found');
    }
    if (
      dto.isProvideTeleHealth === true &&
      user.doctorProfile.status !== DoctorStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Only ACTIVE doctors can enable telehealth',
      );
    }
    await this.repo.updateDoctorProfile(userId, dto);
    return this.getMe(userId);
  }

  async listUsers(query: UserListQueryDto) {
    const [items, total] = await this.repo.listUsers(query);
    return {
      items: items.map((u) => this.mapUser(u)),
      total,
      skip: query.skip ?? 0,
      take: query.take ?? 20,
    };
  }

  async assignRole(targetUserId: string, dto: AssignRoleDto) {
    const target = await this.repo.findById(targetUserId);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    const user = await this.repo.updateUserRole(targetUserId, dto.role);
    return this.mapUser(user);
  }

  async approveDoctor(targetUserId: string) {
    const target = await this.repo.findById(targetUserId);
    if (!target?.doctorProfile) {
      throw new BadRequestException('User is not a doctor');
    }
    await this.repo.approveDoctor(targetUserId);
    return this.getMe(targetUserId);
  }

  async suspendDoctor(targetUserId: string) {
    const target = await this.repo.findById(targetUserId);
    if (!target?.doctorProfile) {
      throw new BadRequestException('User is not a doctor');
    }
    await this.repo.suspendDoctor(targetUserId);
    return this.getMe(targetUserId);
  }

  private mapUser(
    user: NonNullable<Awaited<ReturnType<UsersRepository['findById']>>>,
  ) {
    return {
      ...user,
      doctorProfile: user.doctorProfile
        ? {
            ...user.doctorProfile,
            consultationFee: user.doctorProfile.consultationFee.toString(),
          }
        : null,
    };
  }
}
