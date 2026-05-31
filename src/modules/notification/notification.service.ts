import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { UpdateNotificationPreferenceDto } from './dto/notification-preference.dto';
import { NotificationLogQueryDto } from './dto/notification-log-query.dto';
import {
  NOTIFICATION_QUEUE_NAME,
  NotificationJobType,
} from './constants/notification.constants';
import {
  NotificationJobPayload,
  NotificationProcessor,
} from './notification.processor';
import { NotificationRepository } from './repositories/notification.repository';

function parseRedisConnection(): { host: string; port: number; password?: string } | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port ? Number(parsed.port) : 6379,
      password: parsed.password || undefined,
    };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);
  private queue: Queue<NotificationJobPayload> | null = null;

  constructor(
    private readonly repo: NotificationRepository,
    private readonly processor: NotificationProcessor,
  ) {}

  onModuleInit() {
    const connection = parseRedisConnection();
    if (!connection) {
      this.logger.warn('REDIS_URL not set — notification queue disabled');
      return;
    }

    this.queue = new Queue<NotificationJobPayload>(NOTIFICATION_QUEUE_NAME, {
      connection,
    });
    this.processor.bindWorker(connection);
    this.logger.log('Notification queue started');
  }

  async onModuleDestroy() {
    await this.processor.close();
    await this.queue?.close();
  }

  async enqueue(
    type: NotificationJobType,
    payload: Omit<NotificationJobPayload, 'type'>,
    options?: { delayMs?: number },
  ) {
    if (!this.queue) {
      this.logger.warn(`Queue disabled; skipping ${type}`);
      return null;
    }

    return this.queue.add(type, { ...payload, type }, {
      delay: options?.delayMs,
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }

  getPreferences(userId: string) {
    return this.repo.findPreference(userId).then((p) =>
      p ??
      this.repo.upsertPreference(userId, {}),
    );
  }

  updatePreferences(userId: string, dto: UpdateNotificationPreferenceDto) {
    return this.repo.upsertPreference(userId, dto);
  }

  async listLogs(userId: string, query: NotificationLogQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const [items, total] = await this.repo.listLogs(userId, skip, take);
    return { items, total, skip, take };
  }
}
