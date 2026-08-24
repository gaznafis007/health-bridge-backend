export type VideoRoomRole = 'patient' | 'doctor';

export interface CreateRoomResult {
  roomId: string;
  roomHandle: string;
}

export interface MintJoinTokenParams {
  roomId: string;
  userId: string;
  role: VideoRoomRole;
  ttlSeconds: number;
}

export interface MintJoinTokenResult {
  token: string;
  expiresAt: Date;
}

export interface TelehealthVideoProvider {
  createRoom(telehealthId: string): Promise<CreateRoomResult>;
  mintJoinToken(params: MintJoinTokenParams): Promise<MintJoinTokenResult>;
}
