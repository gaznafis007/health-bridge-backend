import { Injectable } from '@nestjs/common';
import { DoctorStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateDoctorProfileDto } from '../dto/update-doctor-profile.dto';
import { UpdatePatientProfileDto } from '../dto/update-patient-profile.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserListQueryDto } from '../dto/user-list-query.dto';

const userPublicSelect = {
  id: true,
  email: true,
  phone: true,
  role: true,
  firstName: true,
  lastName: true,
  profilePicture: true,
  isVerified: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
  patientProfile: true,
  doctorProfile: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
  }

  updateUser(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName.trim() }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName.trim() }),
        ...(dto.profilePicture !== undefined && {
          profilePicture: dto.profilePicture,
        }),
      },
      select: userPublicSelect,
    });
  }

  updatePatientProfile(userId: string, dto: UpdatePatientProfileDto) {
    return this.prisma.patientProfile.update({
      where: { userId },
      data: {
        ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup }),
        ...(dto.height !== undefined && { height: dto.height }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.dateOfBirth !== undefined && {
          dateOfBirth: new Date(dto.dateOfBirth),
        }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.emergencyContact !== undefined && {
          emergencyContact: dto.emergencyContact,
        }),
        ...(dto.emergencyPhone !== undefined && {
          emergencyPhone: dto.emergencyPhone,
        }),
        ...(dto.medicalHistory !== undefined && {
          medicalHistory: dto.medicalHistory,
        }),
        ...(dto.allergies !== undefined && { allergies: dto.allergies }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.zipCode !== undefined && { zipCode: dto.zipCode }),
      },
    });
  }

  updateDoctorProfile(userId: string, dto: UpdateDoctorProfileDto) {
    return this.prisma.doctorProfile.update({
      where: { userId },
      data: {
        ...(dto.hospital !== undefined && { hospital: dto.hospital }),
        ...(dto.biography !== undefined && { biography: dto.biography }),
        ...(dto.consultationFee !== undefined && {
          consultationFee: dto.consultationFee,
        }),
        ...(dto.isProvideTeleHealth !== undefined && {
          isProvideTeleHealth: dto.isProvideTeleHealth,
        }),
      },
    });
  }

  listUsers(query: UserListQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
    };

    return Promise.all([
      this.prisma.user.findMany({
        where,
        select: userPublicSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  updateUserRole(userId: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: userPublicSelect,
    });
  }

  approveDoctor(userId: string) {
    return this.prisma.doctorProfile.update({
      where: { userId },
      data: {
        status: DoctorStatus.ACTIVE,
        approvedAt: new Date(),
      },
    });
  }

  suspendDoctor(userId: string) {
    return this.prisma.doctorProfile.update({
      where: { userId },
      data: { status: DoctorStatus.SUSPENDED },
    });
  }
}
