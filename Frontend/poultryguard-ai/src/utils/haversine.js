const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function calculateDistance(vendorLat, vendorLng, farmLat, farmLng) {
  const lat1 = Number(vendorLat);
  const lon1 = Number(vendorLng);
  const lat2 = Number(farmLat);
  const lon2 = Number(farmLng);

  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
    return null;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const distance = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));

  return Number(distance.toFixed(1));
}
