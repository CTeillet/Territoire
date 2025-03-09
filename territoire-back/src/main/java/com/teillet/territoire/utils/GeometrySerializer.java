package com.teillet.territoire.utils;


import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import org.locationtech.jts.geom.Point;

import java.io.IOException;

public class GeometrySerializer extends JsonSerializer<Point> {
	@Override
	public void serialize(Point point, JsonGenerator jsonGenerator, SerializerProvider serializers) throws IOException {
		if (point != null) {
			jsonGenerator.writeStartObject();
			jsonGenerator.writeNumberField("latitude", point.getY());
			jsonGenerator.writeNumberField("longitude", point.getX());
			jsonGenerator.writeEndObject();
		} else {
			jsonGenerator.writeNull();
		}
	}
}
