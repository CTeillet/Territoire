package com.teillet.territoire.utils;

import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Envelope;

import static org.junit.jupiter.api.Assertions.*;

class MapMathTest {

	@Test
	void testResolution() {
		double resZ0 = MapMath.resolution(0);
		assertEquals(2 * MapMath.ORIGIN_SHIFT / MapMath.TILE_SIZE, resZ0, 1e-6);

		double resZ1 = MapMath.resolution(1);
		assertEquals(resZ0 / 2.0, resZ1, 1e-6);

		double resZ14 = MapMath.resolution(14);
		assertTrue(resZ14 > 0);
		assertTrue(resZ14 < resZ1);
	}

	@Test
	void testLon2tileX() {
		// Longitude 0 at zoom 0 -> tile 0
		int tileX0 = MapMath.lon2tileX(0.0, 0);
		assertEquals(0, tileX0);

		// Longitude 0 at zoom 1 -> tile 1
		int tileX1 = MapMath.lon2tileX(0.0, 1);
		assertEquals(1, tileX1);

		// Longitude -180 -> tile 0
		int tileXNeg = MapMath.lon2tileX(-180.0, 1);
		assertEquals(0, tileXNeg);

		// Longitude 2.3522 (Paris) at zoom 14
		int tileXParis = MapMath.lon2tileX(2.3522, 14);
		assertTrue(tileXParis > 0 && tileXParis < (1 << 14));
	}

	@Test
	void testLat2tileY() {
		// Latitude 0 at zoom 0 -> tile 0
		int tileY0 = MapMath.lat2tileY(0.0, 0);
		assertEquals(0, tileY0);

		// Latitude 0 at zoom 1 -> tile 1
		int tileY1 = MapMath.lat2tileY(0.0, 1);
		assertEquals(1, tileY1);

		// Latitude 48.8566 (Paris) at zoom 14
		int tileYParis = MapMath.lat2tileY(48.8566, 14);
		assertTrue(tileYParis > 0 && tileYParis < (1 << 14));

		// Latitudes within Web Mercator range
		int tileYNorth = MapMath.lat2tileY(80.0, 10);
		int tileYSouth = MapMath.lat2tileY(-80.0, 10);
		assertTrue(tileYNorth >= 0);
		assertTrue(tileYSouth < (1 << 10));
	}

	@Test
	void testTileBoundsMeters() {
		Envelope bounds = MapMath.tileBoundsMeters(0, 0, 0);
		assertNotNull(bounds);
		assertEquals(-MapMath.ORIGIN_SHIFT, bounds.getMinX(), 1e-3);
		assertEquals(MapMath.ORIGIN_SHIFT, bounds.getMaxX(), 1e-3);
		assertEquals(-MapMath.ORIGIN_SHIFT, bounds.getMinY(), 1e-3);
		assertEquals(MapMath.ORIGIN_SHIFT, bounds.getMaxY(), 1e-3);
	}
}
