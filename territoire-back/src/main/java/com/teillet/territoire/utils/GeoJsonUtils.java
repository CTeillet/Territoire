package com.teillet.territoire.utils;

import com.teillet.territoire.dto.BlockDto;
import com.teillet.territoire.model.Block;
import com.teillet.territoire.model.Territory;
import org.geotools.api.feature.simple.SimpleFeature;
import org.geotools.api.feature.simple.SimpleFeatureType;

import org.geotools.data.collection.ListFeatureCollection;
import org.geotools.feature.simple.SimpleFeatureBuilder;
import org.geotools.feature.simple.SimpleFeatureTypeBuilder;
import org.geotools.geojson.feature.FeatureJSON;
import org.geotools.geojson.geom.GeometryJSON;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.geom.PrecisionModel;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

public class GeoJsonUtils {

	private static final int DECIMAL_PRECISION = 6;
	public static final String BLOCK = "BLOCK";
	public static final String CONCAVE_HULL = "CONCAVE_HULL";


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

	public static String convertToGeoJSON(List<Block> blocks, Polygon concaveHull) throws IOException {
		// Définir le type de feature
		SimpleFeatureType featureType = createPolygonFeatureType();

		// Créer une collection de features
		ListFeatureCollection featureCollection = new ListFeatureCollection(featureType);
		for (Block block : blocks) {
			featureCollection.add(createPolygonFeature(featureType, block.getBlock(), block.getId().toString(), BLOCK));
		}

		if (concaveHull != null) {
			featureCollection.add(createPolygonFeature(featureType, concaveHull, null, CONCAVE_HULL));
		}

		// Convertir en GeoJSON
		GeometryJSON geometryJSON = new GeometryJSON(DECIMAL_PRECISION);
		return new FeatureJSON(geometryJSON).toString(featureCollection);
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

	private static SimpleFeatureType createPolygonFeatureType() {
		SimpleFeatureTypeBuilder builder = new SimpleFeatureTypeBuilder();
		builder.setName("Polygon");
		builder.add("id", String.class);
		builder.add("type", String.class);
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

	private static SimpleFeature createPolygonFeature(SimpleFeatureType featureType, Polygon geom, String id, String type) {
		SimpleFeatureBuilder featureBuilder = new SimpleFeatureBuilder(featureType);
		featureBuilder.add(id);
		featureBuilder.add(type);
		featureBuilder.add(geom);
		return featureBuilder.buildFeature(null);
	}

	public static Polygon convertGeoJsonToPolygon(BlockDto blockDTO) {
		final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

		if (blockDTO.getCoordinates() == null || blockDTO.getCoordinates().isEmpty()) {
			throw new IllegalArgumentException("Le GeoJSON est vide ou invalide.");
		}

		// Extraction des coordonnées
		List<List<Double>> firstRing = blockDTO.getCoordinates().get(0); // On prend le premier anneau (extérieur)
		List<Coordinate> coordinateList = firstRing.stream()
				.map(coord -> new Coordinate(coord.get(0), coord.get(1))) // lng, lat -> Coordinate
				.collect(Collectors.toList());

		// Vérification : Ajouter le premier point à la fin si nécessaire
		if (!coordinateList.get(0).equals(coordinateList.get(coordinateList.size() - 1))) {
			coordinateList.add(coordinateList.get(0)); // Ajoute le premier point à la fin
		}

		// Conversion en tableau pour JTS
		Coordinate[] coordinates = coordinateList.toArray(new Coordinate[0]);

		return geometryFactory.createPolygon(coordinates);
	}
}
