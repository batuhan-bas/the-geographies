import type * as THREE from "three";
import type { GeoCoordinate } from "@/types/geo";
import { geoToSphere } from "./coordinates";

// ==========================================
// Real sun position
// ==========================================
//
// Low-precision solar ephemeris (NOAA / Astronomical Almanac approximation),
// accurate to well under a degree — far more than a globe needs.

const DEG = Math.PI / 180;
const J2000 = 2451545.0;
const MS_PER_DAY = 86400000;
const UNIX_EPOCH_JD = 2440587.5;

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

/**
 * Point on Earth where the sun is directly overhead at the given time.
 */
export function getSubsolarPoint(date: Date): GeoCoordinate {
  const n = date.getTime() / MS_PER_DAY + UNIX_EPOCH_JD - J2000;

  // Sun's ecliptic longitude
  const meanLongitude = normalizeDegrees(280.46 + 0.9856474 * n);
  const meanAnomaly = normalizeDegrees(357.528 + 0.9856003 * n) * DEG;
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG;
  const obliquity = (23.439 - 0.0000004 * n) * DEG;

  // Equatorial coordinates
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );

  // Greenwich mean sidereal time → longitude where the sun is overhead
  const gmst = normalizeDegrees(280.46061837 + 360.98564736629 * n);
  let longitude = normalizeDegrees(rightAscension / DEG - gmst);
  if (longitude > 180) {
    longitude -= 360;
  }

  return { longitude, latitude: declination / DEG };
}

/**
 * Write the unit vector pointing from Earth's center to the sun (in globe
 * space, matching geoToSphere) into `target`.
 */
export function setSunDirectionFromDate(date: Date, target: THREE.Vector3): THREE.Vector3 {
  const { longitude, latitude } = getSubsolarPoint(date);
  const p = geoToSphere(longitude, latitude, 1);
  return target.set(p.x, p.y, p.z).normalize();
}
