package com.teillet.territoire.utils;

import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.JsonNode;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;

public class GeometryDeserializer extends ValueDeserializer<Point> {
	@Override
	public Point deserialize(JsonParser jsonParser, DeserializationContext deserializationContext) {
		JsonNode node = deserializationContext.readTree(jsonParser);

		// Vérifie si l'objet contient un tableau "coordinates"
		if (node.has("coordinates") && node.get("coordinates").isArray()) {
			double longitude = node.get("coordinates").get(0).asDouble();
			double latitude = node.get("coordinates").get(1).asDouble();
			return new GeometryFactory().createPoint(new Coordinate(longitude, latitude));
		}
		// Vérifie si l'objet contient "latitude" et "longitude" sous forme d'attributs séparés
		else if (node.has("latitude") && node.has("longitude")) {
			double latitude = node.get("latitude").asDouble();
			double longitude = node.get("longitude").asDouble();
			return new GeometryFactory().createPoint(new Coordinate(longitude, latitude));
		}

		return deserializationContext.reportInputMismatch(Point.class, "Format JSON invalide pour la désérialisation d'un Point");
	}
}
