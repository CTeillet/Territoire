package com.teillet.territoire.utils;


import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.SerializationContext;
import org.locationtech.jts.geom.Point;

public class GeometrySerializer extends ValueSerializer<Point> {
	@Override
	public void serialize(Point point, JsonGenerator jsonGenerator, SerializationContext serializers) {
		if (point != null) {
			jsonGenerator.writeStartObject();
			jsonGenerator.writeNumberProperty("latitude", point.getY());
			jsonGenerator.writeNumberProperty("longitude", point.getX());
			jsonGenerator.writeEndObject();
		} else {
			jsonGenerator.writeNull();
		}
	}
}
