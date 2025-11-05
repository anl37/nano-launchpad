/**
 * Geospatial utilities for Spotmate proximity matching
 * Uses ngeohash for spatial indexing and Haversine for distance
 */

import ngeohash from 'ngeohash';
import { FEATURE_FLAGS } from '@/config/featureFlags';

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Encode coordinates to geohash
 * @param lat Latitude
 * @param lng Longitude
 * @param precision Geohash precision (default: 7 for ~150m squares)
 */
export function toGeohash(lat: number, lng: number, precision: number = FEATURE_FLAGS.geohashPrecision): string {
  return ngeohash.encode(lat, lng, precision);
}

/**
 * Decode geohash to coordinates
 */
export function fromGeohash(geohash: string): Coordinates {
  const { latitude, longitude } = ngeohash.decode(geohash);
  return { lat: latitude, lng: longitude };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get geohash neighbors for bounding box queries
 * Returns array of geohashes to query for ~25m radius coverage
 */
export function getGeohashNeighbors(geohash: string): string[] {
  const neighbors = ngeohash.neighbors(geohash) as Record<string, string>;
  
  // Return center + 8 neighbors
  return [
    geohash,
    ...Object.values(neighbors)
  ];
}

/**
 * Get geohash prefix for bounding box query
 * Precision 6 = ~1.2km squares, good for initial filtering
 */
export function getGeohashBboxPrefix(lat: number, lng: number, precision: number = 6): string {
  return toGeohash(lat, lng, precision);
}

/**
 * Check if two locations are within specified distance
 */
export function isWithinDistance(
  coords1: Coordinates,
  coords2: Coordinates,
  maxDistanceMeters: number
): boolean {
  const distance = distanceMeters(coords1.lat, coords1.lng, coords2.lat, coords2.lng);
  return distance <= maxDistanceMeters;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Calculate bounds from center point and radius
 * Useful for map display
 */
export function getBounds(center: Coordinates, radiusMeters: number) {
  const latDelta = (radiusMeters / 111320); // 1 degree latitude ≈ 111,320 meters
  const lngDelta = (radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180)));
  
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

/**
 * Generate pair ID for matches (idempotent)
 * Ensures consistent ID regardless of user order
 */
export function generatePairId(userId1: string, userId2: string): string {
  const ids = [userId1, userId2].sort();
  return `${ids[0]}_${ids[1]}`;
}
