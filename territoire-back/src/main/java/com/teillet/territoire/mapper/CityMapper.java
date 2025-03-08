package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.CityDto;
import com.teillet.territoire.model.City;

public class CityMapper {
	public static CityDto toDto(City city) {
		return CityDto.builder()
				.id(city.getId())
				.name(city.getName()).build();
	}
}
