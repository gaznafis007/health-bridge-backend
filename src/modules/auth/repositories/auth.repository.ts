import { Injectable } from '@nestjs/common';
import { DoctorStatus, UserRole } from '@prisma/client';

import { SignupDto } from '../dto/signup.dto';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmailOrPhone(identity: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: identity }, { phone: identity }],
      },
    });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async createUserWithProfile(data: SignupDto, passwordHash: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          phone: data.phone.trim(),
          passwordHash,
          role: data.role,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
        },
      });

      if (data.role === UserRole.PATIENT) {
        await tx.patientProfile.create({
          data: { userId: user.id },
        });
      }

      if (data.role === UserRole.DOCTOR) {
        await tx.doctorProfile.create({
          data: {
            userId: user.id,
            licenseNumber: data.licenseNumber!,
            specialization: data.specialization!,
            qualification: data.qualification!,
            consultationFee: 0,
            status: DoctorStatus.PENDING,
          },
        });
      }

      return user;
    });
  }

  async storeRefreshToken(
    userId: string,
    hashedToken: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string,
  ) {
    return this.prisma.refreshToken.create({
      data: {
        userId,
        token: hashedToken,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });
  }

  findActiveRefreshTokensForUser(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  revokeRefreshTokenById(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  revokeAllUserTokens(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
