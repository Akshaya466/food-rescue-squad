const DEFAULT_LOCATION_MAX_AGE_MS = 15 * 60 * 1000;

function validCoordinates(location) {
  return location
    && Number.isFinite(location.lat)
    && location.lat >= -90
    && location.lat <= 90
    && Number.isFinite(location.lng)
    && location.lng >= -180
    && location.lng <= 180;
}

function distanceKm(from, to) {
  if (!validCoordinates(from) || !validCoordinates(to)) return null;

  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(from.lat))
    * Math.cos(radians(to.lat))
    * Math.sin(lngDelta / 2) ** 2;
  const bounded = Math.max(0, Math.min(1, a));
  return Math.round(
    6371 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded)) * 10
  ) / 10;
}

function rankEligiblePartners(
  partners,
  pickupLocation,
  {
    now = Date.now(),
    maxLocationAgeMs = DEFAULT_LOCATION_MAX_AGE_MS,
    maxDistanceKm = Number.POSITIVE_INFINITY,
  } = {}
) {
  if (!validCoordinates(pickupLocation)) return [];

  const seen = new Set();
  return partners
    .filter((partner) => {
      if (
        !partner
        || typeof partner.id !== "string"
        || !partner.id
        || seen.has(partner.id)
        || partner.role !== "volunteer"
        || partner.isAvailable !== true
        || !validCoordinates(partner.location)
      ) {
        return false;
      }
      const locationTime = Date.parse(partner.locationUpdatedAt);
      if (
        !Number.isFinite(locationTime)
        || locationTime > now
        || now - locationTime > maxLocationAgeMs
      ) {
        return false;
      }
      seen.add(partner.id);
      return true;
    })
    .map((partner) => ({
      id: partner.id,
      distanceKm: distanceKm(pickupLocation, partner.location),
    }))
    .filter((partner) => partner.distanceKm !== null && partner.distanceKm <= maxDistanceKm)
    .sort((left, right) => left.distanceKm - right.distanceKm);
}

function selectNextRecipient(rankedPartners, attemptedIds = []) {
  const attempted = new Set(attemptedIds);
  return rankedPartners.find((partner) => !attempted.has(partner.id)) || null;
}

async function notifyNextEligiblePartner(
  rankedPartners,
  attemptedIds,
  sendNotification
) {
  const attempted = new Set(attemptedIds);
  const failures = [];

  for (const partner of rankedPartners) {
    if (attempted.has(partner.id)) continue;
    attempted.add(partner.id);

    try {
      await sendNotification(partner);
      return { status: "notified", recipientId: partner.id, failures };
    } catch (error) {
      failures.push({
        recipientId: partner.id,
        message: error instanceof Error ? error.message : "Notification failed.",
      });
    }
  }

  return {
    status: failures.length ? "failed" : "no-eligible-partner",
    failures,
  };
}

module.exports = {
  DEFAULT_LOCATION_MAX_AGE_MS,
  distanceKm,
  notifyNextEligiblePartner,
  rankEligiblePartners,
  selectNextRecipient,
  validCoordinates,
};
