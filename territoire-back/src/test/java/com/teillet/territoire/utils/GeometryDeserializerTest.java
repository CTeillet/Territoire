package com.teillet.territoire.utils;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.module.SimpleModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Point;

import tools.jackson.core.JacksonException;

import static org.junit.jupiter.api.Assertions.*;

class GeometryDeserializerTest {

	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() {
		SimpleModule module = new SimpleModule();
		module.addDeserializer(Point.class, new GeometryDeserializer());
		objectMapper = JsonMapper.builder().addModule(module).build();
	}

	@Test
	void testDeserializeCoordinatesArray() throws Exception {
		String json = "{\"coordinates\": [-1.6777, 48.1173]}";
		Point point = objectMapper.readValue(json, Point.class);

		assertNotNull(point);
		assertEquals(-1.6777, point.getX(), 1e-4);
		assertEquals(48.1173, point.getY(), 1e-4);
	}

	@Test
	void testDeserializeLatLonAttributes() throws Exception {
		String json = "{\"longitude\": 2.3522, \"latitude\": 48.8566}";
		Point point = objectMapper.readValue(json, Point.class);

		assertNotNull(point);
		assertEquals(2.3522, point.getX(), 1e-4);
		assertEquals(48.8566, point.getY(), 1e-4);
	}

	@Test
	void testDeserializeInvalidFormatThrowsJacksonException() {
		String json = "{\"unknown\": 123}";
		assertThrows(JacksonException.class, () -> objectMapper.readValue(json, Point.class));
	}
}
