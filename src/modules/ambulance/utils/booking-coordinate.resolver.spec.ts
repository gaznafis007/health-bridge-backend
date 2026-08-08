import { BookingCoordinateResolver } from './booking-coordinate.resolver';
import { GeocodingService } from '../../geocoding/geocoding.service';
import { AmbulanceRepository } from '../repositories/ambulance.repository';
import { CreateBookingDto } from '../dto/ambulance-request.dto';

function makeGeocoding(): jest.Mocked<Pick<GeocodingService, 'geocode'>> {
  return {
    geocode: jest.fn(),
  };
}

function makeRepo(): jest.Mocked<Pick<AmbulanceRepository, 'findHealthCenterById'>> {
  return {
    findHealthCenterById: jest.fn(),
  };
}

const baseDto: CreateBookingDto = {
  pickupAddress: 'Dhanmondi, Dhaka',
  destinationAddress: 'Gulshan, Dhaka',
  emergencyType: 'Cardiac',
  patientCondition: 'Stable',
};

describe('BookingCoordinateResolver', () => {
  it('resolves pickup and destination from addresses only', async () => {
    const geocoding = makeGeocoding();
    geocoding.geocode
      .mockResolvedValueOnce({ label: 'Pickup', lat: 23.7461, lng: 90.3742 })
      .mockResolvedValueOnce({ label: 'Destination', lat: 23.7925, lng: 90.4078 });

    const repo = makeRepo();
    const resolver = new BookingCoordinateResolver(
      geocoding as unknown as GeocodingService,
      repo as unknown as AmbulanceRepository,
    );

    const result = await resolver.resolve(baseDto, 'patient-1');
    expect(result).toEqual({
      pickupLatitude: 23.7461,
      pickupLongitude: 90.3742,
      destinationLatitude: 23.7925,
      destinationLongitude: 90.4078,
    });
  });

  it('uses health center coordinates for destination when destinationCenterId is set', async () => {
    const geocoding = makeGeocoding();
    geocoding.geocode.mockResolvedValueOnce({
      label: 'Pickup',
      lat: 23.7461,
      lng: 90.3742,
    });

    const repo = makeRepo();
    repo.findHealthCenterById.mockResolvedValue({
      id: 'hc-1',
      latitude: 23.81,
      longitude: 90.41,
    } as never);

    const resolver = new BookingCoordinateResolver(
      geocoding as unknown as GeocodingService,
      repo as unknown as AmbulanceRepository,
    );

    const result = await resolver.resolve(
      { ...baseDto, destinationCenterId: 'hc-1' },
      'patient-1',
    );

    expect(result.destinationLatitude).toBe(23.81);
    expect(result.destinationLongitude).toBe(90.41);
    expect(geocoding.geocode).toHaveBeenCalledTimes(1);
  });

  it('throws PICKUP_ADDRESS_NOT_FOUND when pickup geocode fails', async () => {
    const geocoding = makeGeocoding();
    geocoding.geocode.mockResolvedValue(null);

    const resolver = new BookingCoordinateResolver(
      geocoding as unknown as GeocodingService,
      makeRepo() as unknown as AmbulanceRepository,
    );

    await expect(resolver.resolve(baseDto, 'patient-1')).rejects.toMatchObject({
      response: {
        code: 'PICKUP_ADDRESS_NOT_FOUND',
      },
    });
  });

  it('prefers server geocoded pickup when client coords drift too far', async () => {
    const geocoding = makeGeocoding();
    geocoding.geocode
      .mockResolvedValueOnce({ label: 'Pickup', lat: 23.7461, lng: 90.3742 })
      .mockResolvedValueOnce({ label: 'Destination', lat: 23.7925, lng: 90.4078 });

    const resolver = new BookingCoordinateResolver(
      geocoding as unknown as GeocodingService,
      makeRepo() as unknown as AmbulanceRepository,
    );

    const result = await resolver.resolve(
      {
        ...baseDto,
        pickupLatitude: 24.5,
        pickupLongitude: 91.0,
      },
      'patient-1',
    );

    expect(result.pickupLatitude).toBe(23.7461);
    expect(result.pickupLongitude).toBe(90.3742);
  });
});
