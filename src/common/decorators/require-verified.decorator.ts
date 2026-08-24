import { SetMetadata } from '@nestjs/common';

export const REQUIRE_VERIFIED_KEY = 'requireVerified';
export const RequireVerified = () => SetMetadata(REQUIRE_VERIFIED_KEY, true);
