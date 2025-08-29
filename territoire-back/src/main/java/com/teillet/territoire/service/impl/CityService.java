package com.teillet.territoire.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.AddCityDto;
import com.teillet.territoire.model.City;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.service.ICityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CityService implements ICityService {
	private final CityRepository cityRepository;
	private final GeometryFactory pointGeometryFactory = new GeometryFactory(new PrecisionModel(), 4326); // WGS 84
	private final RestTemplate restTemplate;
	private  final ObjectMapper objectMapper;

	@Override
	public City getCity(UUID cityId) {
		return cityRepository.findById(cityId).orElseThrow(() -> {
			log.warn("Ville avec l'ID {} non trouvée.", cityId);
			return new RuntimeException("Ville non trouvée");
		});
	}

	@Override
	public City addCity(AddCityDto city) {
		City cityEntity = new City();
		cityEntity.setName(city.getName());
		cityEntity.setZipCode(city.getZipCode());
		// set color if provided
		cityEntity.setColorHex(city.getColorHex());

		Point center = getCityCoordinates(city.getZipCode());

		if (center == null) {
			throw new RuntimeException("Ville non trouvée");
		}

		cityEntity.setCenter(center);

		return cityRepository.save(cityEntity);
	}

	@Override
	public List<City> getCities() {
		return cityRepository.findAll();
	}

	@Override
	public void deleteCity(UUID cityId) {
		cityRepository.deleteById(cityId);
	}

	public Point getCityCoordinates(String zipCode) {
		String url = "https://geo.api.gouv.fr/communes?fields=centre&codePostal=" + zipCode;

		try {
			String response = restTemplate.getForObject(url, String.class);
			JsonNode rootNode = objectMapper.readTree(response);

			if (rootNode.isArray() && !rootNode.isEmpty()) {
				JsonNode centreNode = rootNode.get(0).get("centre").get("coordinates");
				double longitude = centreNode.get(0).asDouble();
				double latitude = centreNode.get(1).asDouble();

				return pointGeometryFactory.createPoint(new Coordinate(longitude, latitude));
			}
		} catch (Exception e) {
			log.error("Problème lors de la récupération de la ville via geo.api.gouv.fr", e);
		}

 	return null; // Si la ville n'est pas trouvée
	}

	@Override
	public City updateCityColor(UUID cityId, String colorHex) {
		City city = getCity(cityId);
		if (colorHex != null) {
			String trimmed = colorHex.trim();
			if (!trimmed.matches("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")) {
				throw new IllegalArgumentException("Code couleur hexadécimal invalide");
			}
			city.setColorHex(trimmed);
		} else {
			city.setColorHex(null);
		}
		return cityRepository.save(city);
	}

}
