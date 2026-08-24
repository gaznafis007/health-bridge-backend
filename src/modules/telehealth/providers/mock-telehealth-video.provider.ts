import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import {
  CreateRoomResult,
  MintJoinTokenParams,
  MintJoinTokenResult,
  TelehealthVideoProvider,
} from './telehealth-video-provider.interface';

@Injectable()
export class MockTelehealthVideoProvider implements TelehealthVideoProvider {
  private readonly logger = new Logger(MockTelehealthVideoProvider.name);
  private readonly secret: string;

  constructor() {
    this.secret =
      process.env.TELEHEALTH_VIDEO_SECRET ??
      process.env.JWT_SECRET ??
      'dev-telehealth-video-secret-change-me';
    if (!process.env.TELEHEALTH_VIDEO_SECRET) {
      this.logger.warn(
        'TELEHEALTH_VIDEO_SECRET not set — using fallback secret for mock video tokens',
      );
    }
  }

  async createRoom(telehealthId: string): Promise<CreateRoomResult> {
    const roomId = `room_${telehealthId}`;
    const roomHandle = randomBytes(16).toString('hex');
    return { roomId, roomHandle };
  }

  async mintJoinToken(params: MintJoinTokenParams): Promise<MintJoinTokenResult> {
    const expiresAt = new Date(Date.now() + params.ttlSeconds * 1000);
    const payload = {
      roomId: params.roomId,
      userId: params.userId,
      role: params.role,
      exp: Math.floor(expiresAt.getTime() / 1000),
      iat: Math.floor(Date.now() / 1000),
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.secret)
      .update(body)
      .digest('base64url');
    const token = `${body}.${sig}`;
    return { token, expiresAt };
  }
}
