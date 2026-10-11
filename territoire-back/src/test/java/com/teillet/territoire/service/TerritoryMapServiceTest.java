package com.teillet.territoire.service;

import com.teillet.territoire.record.TileImage;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.repository.projection.Bbox3857;
import com.teillet.territoire.repository.projection.TerritoryHullRow;
import com.teillet.territoire.service.impl.TerritoryMapService;
import com.teillet.territoire.utils.WmtsClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.io.WKBWriter;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.awt.image.BufferedImage;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TerritoryMapServiceTest {

	@Mock
	private TerritoryRepository territoryRepository;

	@Mock
	private WmtsClient wmtsClient;

	@InjectMocks
	private TerritoryMapService territoryMapService;

	private final GeometryFactory gf = new GeometryFactory();
	private final WKBWriter wkbWriter = new WKBWriter();

	@Test
	void testGeneratePng_EmptyRows_ReturnsEmptyPng() throws Exception {
		when(territoryRepository.findAllProjected3857()).thenReturn(Collections.emptyList());

		byte[] png = territoryMapService.generatePng("A4", "landscape", 100, null, 14, true);
		assertNotNull(png);
		assertTrue(png.length > 0);
	}

	@Test
	void testGeneratePng_NullBbox_ReturnsEmptyPng() throws Exception {
		TerritoryHullRow row = createHullRow("Territoire 1", "#3498db");
		when(territoryRepository.findAllProjected3857()).thenReturn(List.of(row));
		when(territoryRepository.findBbox3857()).thenReturn(null);

		byte[] png = territoryMapService.generatePng("A4", "landscape", 100, null, 14, true);
		assertNotNull(png);
		assertTrue(png.length > 0);
	}

	@Test
	void testGeneratePng_Success_WithCityIdAndLabels() throws Exception {
		UUID cityId = UUID.randomUUID();
		TerritoryHullRow row = createHullRow("Territoire 1", "#e74c3c");

		when(territoryRepository.findAllProjected3857ByCityId(cityId)).thenReturn(List.of(row));

		Bbox3857 bbox = new Bbox3857() {
			@Override
			public Double getMinx() { return 100.0; }
			@Override
			public Double getMiny() { return 100.0; }
			@Override
			public Double getMaxx() { return 500.0; }
			@Override
			public Double getMaxy() { return 500.0; }
		};
		when(territoryRepository.findBbox3857ByCityId(cityId)).thenReturn(bbox);

		BufferedImage mockMosaic = new BufferedImage(400, 400, BufferedImage.TYPE_INT_ARGB);
		TileImage tileImage = new TileImage(mockMosaic, new Envelope(50.0, 550.0, 50.0, 550.0), 400, 400);
		when(wmtsClient.fetchTiles3857(any(Envelope.class), anyInt())).thenReturn(tileImage);

		byte[] png = territoryMapService.generatePng("A4", "portrait", 100, cityId, 14, true);
		assertNotNull(png);
		assertTrue(png.length > 0);
	}

	private TerritoryHullRow createHullRow(String name, String color) {
		Polygon poly = gf.createPolygon(new Coordinate[]{
				new Coordinate(150, 150),
				new Coordinate(450, 150),
				new Coordinate(450, 450),
				new Coordinate(150, 450),
				new Coordinate(150, 150)
		});
		Point labelPoint = gf.createPoint(new Coordinate(300, 300));

		byte[] hullWkb = wkbWriter.write(poly);
		byte[] labelWkb = wkbWriter.write(labelPoint);

		return new TerritoryHullRow() {
			@Override
			public String getName() { return name; }
			@Override
			public byte[] getHullWkb() { return hullWkb; }
			@Override
			public byte[] getLabelWkb() { return labelWkb; }
			@Override
			public String getCityColorHex() { return color; }
		};
	}
}
