package com.teillet.territoire.utils;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;

import java.io.IOException;

public class GeometryDeserializer extends JsonDeserializer<Point> {
	@Override
	public Point deserialize(JsonParser jsonParser, DeserializationContext deserializationContext) throws IOException {
		JsonNode node = jsonParser.getCodec().readTree(jsonParser);

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

		throw new IOException("Format JSON invalide pour la désérialisation d'un Point");
	}
}
