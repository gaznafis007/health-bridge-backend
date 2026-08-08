import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PrismaService } from '../src/database/prisma.service';
import { GEOCODING_PROVIDER } from '../src/modules/geocoding/constants/geocoding.constants';
import { MockGeocodingProvider } from '../src/modules/geocoding/providers/mock-geocoding.provider';
import { NotificationService } from '../src/modules/notification/notification.service';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';

const patientUser = {
  id: 'patient-id',
  email: 'patient@test.com',
  role: UserRole.PATIENT,
};

class TestJwtAuthGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: typeof patientUser }>();
    req.user = patientUser;
    return true;
  }
}

describe('Geocoding & Ambulance booking (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let patientToken: string;

  const mockPrisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    $transaction: jest.fn(),
    healthCenter: {
      findUnique: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve({
          id: '00000000-0000-4000-8000-000000000001',
          name: 'City Hospital',
          latitude: 23.81,
          longitude: 90.41,
        }),
      ),
      findMany: jest.fn().mockResolvedValue([
        {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'City Hospital',
          latitude: 23.81,
          longitude: 90.41,
        },
      ]),
    },
    ambulanceBooking: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'bk-new',
          ...data,
          status: 'REQUESTED',
          originCenter: {
            id: '00000000-0000-4000-8000-000000000001',
            name: 'City Hospital',
          },
          destinationCenter: null,
        }),
      ),
      findUnique: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve({
          id: where.id ?? 'bk-new',
          patientId: 'patient-id',
          pickupLatitude: 23.7461,
          pickupLongitude: 90.3742,
          destinationLatitude: 23.7925,
          destinationLongitude: 90.4078,
          estimatedDistance: 5.2,
          estimatedFare: { toString: () => '304.00' },
          status: 'REQUESTED',
          patient: {
            id: 'patient-id',
            firstName: 'Test',
            lastName: 'Patient',
            phone: '+8801700000000',
            email: 'patient@test.com',
          },
          ambulance: null,
          driver: null,
          originCenter: {
            id: '00000000-0000-4000-8000-000000000001',
            name: 'City Hospital',
            address: 'Addr',
          },
          destinationCenter: null,
          dispatchAssignment: null,
        }),
      ),
    },
    ambulance: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeAll(async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.REDIS_URL;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .overrideProvider(NotificationService)
      .useValue({ enqueue: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(GEOCODING_PROVIDER)
      .useClass(MockGeocodingProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    jwtService = moduleFixture.get(JwtService);
    patientToken = await jwtService.signAsync({
      sub: patientUser.id,
      role: patientUser.role,
      email: patientUser.email,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /geocoding/search returns results for authenticated patient', () => {
    return request(app.getHttpServer())
      .get('/geocoding/search?q=Dhanmondi&limit=5')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.results)).toBe(true);
        expect(res.body.results.length).toBeGreaterThan(0);
        expect(res.body.results[0]).toHaveProperty('label');
        expect(res.body.results[0]).toHaveProperty('lat');
        expect(res.body.results[0]).toHaveProperty('lng');
      });
  });

  it('GET /geocoding/reverse returns a result for patient JWT', () => {
    return request(app.getHttpServer())
      .get('/geocoding/reverse?lat=23.7461&lng=90.3742')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.result).toHaveProperty('label');
        expect(res.body.result.lat).toBe(23.7461);
        expect(res.body.result.lng).toBe(90.3742);
      });
  });

  it('POST /ambulance/bookings accepts addresses only and stores coordinates', () => {
    return request(app.getHttpServer())
      .post('/ambulance/bookings')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        pickupAddress: 'Dhanmondi, Dhaka',
        destinationAddress: 'Gulshan, Dhaka',
        originCenterId: '00000000-0000-4000-8000-000000000001',
        vehicleTypeRequired: 'BASIC',
        emergencyType: 'Cardiac',
        patientCondition: 'Stable',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.pickupLatitude).toBeDefined();
        expect(res.body.pickupLongitude).toBeDefined();
        expect(res.body.destinationLatitude).toBeDefined();
        expect(res.body.destinationLongitude).toBeDefined();
      });
  });
});
