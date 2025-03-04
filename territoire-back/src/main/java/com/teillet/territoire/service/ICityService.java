package com.teillet.territoire.service;

import com.teillet.territoire.dto.AddCityDto;
import com.teillet.territoire.model.City;

import java.util.List;
import java.util.UUID;

public interface ICityService {
	City getCity(String name);
	City getCity(UUID id);
	City addCity(AddCityDto city);

	List<City> getCities();
}
