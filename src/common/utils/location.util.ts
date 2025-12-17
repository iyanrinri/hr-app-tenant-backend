/**
 * Validate if coordinates are valid
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Validate if user location is within allowed radius from checkpoint
 */
export function validateLocation(
  userLatitude: number,
  userLongitude: number,
  checkpointLatitude: number,
  checkpointLongitude: number,
  allowedRadius: number
): { isValid: boolean; distance?: number; message: string } {
  const distance = calculateDistance(
    userLatitude,
    userLongitude,
    checkpointLatitude,
    checkpointLongitude
  );

  if (distance <= allowedRadius) {
    return {
      isValid: true,
      distance: Math.round(distance),
      message: 'Lokasi valid',
    };
  }

  return {
    isValid: false,
    distance: Math.round(distance),
    message: `Anda berada ${Math.round(distance)} meter dari checkpoint. Jarak maksimal adalah ${allowedRadius} meter.`,
  };
}
