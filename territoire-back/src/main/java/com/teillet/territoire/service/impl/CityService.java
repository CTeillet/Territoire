package com.teillet.territoire.service.impl;

import com.teillet.territoire.dto.AddCityDto;
import com.teillet.territoire.model.City;
import com.teillet.territoire.repository.CityRepository;
import com.teillet.territoire.service.ICityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CityService implements ICityService {
	private final CityRepository cityRepository;

	@Override
	public City getCity(UUID cityId) {
		return cityRepository.findById(cityId).orElseThrow(() -> {
			log.warn("Ville avec l'ID {} non trouvée.", cityId);
			return new RuntimeException("Ville non trouvée");
		});
	}

	@Override
	public City getCity(String name) {
		return cityRepository.findByName(name).orElseThrow(() -> {
			log.warn("Ville avec le nom {} non trouvée.", name);
			return new RuntimeException("Ville non trouvée");
		});
	}

	@Override
	public City addCity(AddCityDto city) {
		City cityEntity = new City();
		cityEntity.setName(city.getName());

		return cityRepository.save(cityEntity);
	}

	@Override
	public List<City> getCities() {
		return cityRepository.findAll();
	}

}
