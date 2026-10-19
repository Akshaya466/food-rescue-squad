import { describe, expect, it, vi } from "vitest";
import { getCurrentCoordinates, parseCoordinates } from "./locationService";

describe("parseCoordinates", () => {
  it("accepts valid pickup coordinates", () => {
    expect(parseCoordinates("12.9", "77.6")).toEqual({ lat: 12.9, lng: 77.6 });
  });

  it("rejects missing and out-of-range coordinates", () => {
    expect(() => parseCoordinates("", "77.6")).toThrow(/valid pickup coordinates/i);
    expect(() => parseCoordinates("91", "77.6")).toThrow(/valid pickup coordinates/i);
    expect(() => parseCoordinates("12.9", "-181")).toThrow(/valid pickup coordinates/i);
  });
});

describe("getCurrentCoordinates", () => {
  it("reads coordinates from the browser location service", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: { latitude: 12.9, longitude: 77.6 },
      } as GeolocationPosition);
    });

    await expect(
      getCurrentCoordinates({ getCurrentPosition } as unknown as Geolocation)
    ).resolves.toEqual({ lat: 12.9, lng: 77.6 });
  });

  it("explains location permission denial without silently substituting coordinates", async () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 1,
          PERMISSION_DENIED: 1,
        } as GeolocationPositionError);
      }
    );

    await expect(
      getCurrentCoordinates({ getCurrentPosition } as unknown as Geolocation)
    ).rejects.toThrow(/permission was denied/i);
  });

  it("reports unsupported browser location", async () => {
    await expect(getCurrentCoordinates(undefined)).rejects.toThrow(
      /not available in this browser/i
    );
  });
});
