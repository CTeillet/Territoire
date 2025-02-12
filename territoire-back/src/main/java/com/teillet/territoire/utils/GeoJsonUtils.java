package com.teillet.territoire.utils;

import com.teillet.territoire.model.Territory;
import org.geotools.api.feature.simple.SimpleFeature;
import org.geotools.api.feature.simple.SimpleFeatureType;

import org.geotools.data.collection.ListFeatureCollection;
import org.geotools.feature.simple.SimpleFeatureBuilder;
import org.geotools.feature.simple.SimpleFeatureTypeBuilder;
import org.geotools.geojson.feature.FeatureJSON;
import org.geotools.geojson.geom.GeometryJSON;
import org.locationtech.jts.geom.Polygon;
import java.io.IOException;
import java.util.List;

public class GeoJsonUtils {

	private static final int DECIMAL_PRECISION = 6;

	public static String convertToGeoJSON(List<Territory> territories) throws IOException {
		// Définir le type de feature
		SimpleFeatureType featureType = createTerritoryFeatureType();

		// Créer une collection de features
		ListFeatureCollection featureCollection = new ListFeatureCollection(featureType);
		for (Territory territory : territories) {
			featureCollection.add(createTerritoryFeature(featureType, territory));
		}

		// Convertir en GeoJSON
		GeometryJSON geometryJSON = new GeometryJSON(DECIMAL_PRECISION);
		FeatureJSON featureJSON = new FeatureJSON(geometryJSON);
		return featureJSON.toString(featureCollection);
	}

	private static SimpleFeatureType createTerritoryFeatureType() {
		SimpleFeatureTypeBuilder builder = new SimpleFeatureTypeBuilder();
		builder.setName("Territory");
		builder.add("id", String.class);
		builder.add("name", String.class);
		builder.add("status", String.class);
		builder.add("city", String.class);
		builder.add("geometry", Polygon.class);
		return builder.buildFeatureType();
	}

	private static SimpleFeature createTerritoryFeature(SimpleFeatureType featureType, Territory territory) {
		SimpleFeatureBuilder featureBuilder = new SimpleFeatureBuilder(featureType);
		featureBuilder.add(territory.getId().toString());
		featureBuilder.add(territory.getName());
		featureBuilder.add(territory.getStatus().name());
		featureBuilder.add(territory.getCity());
		featureBuilder.add(territory.getConcaveHull());
		return featureBuilder.buildFeature(null);
	}
}
