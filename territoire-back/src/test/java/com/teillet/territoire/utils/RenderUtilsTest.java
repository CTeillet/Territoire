package com.teillet.territoire.utils;

import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LinearRing;
import org.locationtech.jts.geom.Polygon;

import java.awt.*;

import static org.junit.jupiter.api.Assertions.*;

class RenderUtilsTest {

	private final GeometryFactory gf = new GeometryFactory();

	@Test
	void testPaperToPixels() {
		Dimension a3Landscape = RenderUtils.paperToPixels("A3", "landscape", 300);
		assertEquals(3508, a3Landscape.width);
		assertEquals(4961, a3Landscape.height);

		Dimension a3Portrait = RenderUtils.paperToPixels("A3", "portrait", 300);
		assertEquals(4961, a3Portrait.width);
		assertEquals(3508, a3Portrait.height);

		Dimension a4Landscape = RenderUtils.paperToPixels("A4", "landscape", 300);
		assertEquals(2480, a4Landscape.width);
		assertEquals(3508, a4Landscape.height);

		Dimension a4Portrait = RenderUtils.paperToPixels("A4", "portrait", 300);
		assertEquals(3508, a4Portrait.width);
		assertEquals(2480, a4Portrait.height);
	}

	@Test
	void testEmptyPng() throws Exception {
		byte[] png = RenderUtils.emptyPng(100, 100);
		assertNotNull(png);
		assertTrue(png.length > 0);
	}

	@Test
	void testToShape_WithPolygonAndHole() {
		Coordinate[] shellCoords = new Coordinate[]{
				new Coordinate(0, 0),
				new Coordinate(100, 0),
				new Coordinate(100, 100),
				new Coordinate(0, 100),
				new Coordinate(0, 0)
		};
		LinearRing shell = gf.createLinearRing(shellCoords);

		Coordinate[] holeCoords = new Coordinate[]{
				new Coordinate(20, 20),
				new Coordinate(80, 20),
				new Coordinate(80, 80),
				new Coordinate(20, 80),
				new Coordinate(20, 20)
		};
		LinearRing hole = gf.createLinearRing(holeCoords);

		Polygon poly = gf.createPolygon(shell, new LinearRing[]{hole});

		Shape shape = RenderUtils.toShape(poly, 1.0, 10.0, 100.0);
		assertNotNull(shape);
		assertNotNull(shape.getBounds2D());
	}
}
