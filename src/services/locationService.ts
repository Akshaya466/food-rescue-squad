export interface Coordinates {
  lat: number;
  lng: number;
}

export function parseCoordinates(latitude: string, longitude: string): Coordinates {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    latitude.trim() === "" ||
    longitude.trim() === "" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    throw new Error("Enter valid pickup coordinates or use your current location.");
  }

  return { lat, lng };
}

export function getCurrentCoordinates(
  geolocation: Geolocation | undefined = navigator.geolocation
): Promise<Coordinates> {
  if (!geolocation) {
    return Promise.reject(new Error("Location is not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (error) => {
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? "Location permission was denied. Enter the pickup coordinates manually."
              : "Could not get your location. Try again or enter the pickup coordinates manually."
          )
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}
