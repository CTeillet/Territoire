package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.AddTerritoryDto;
import com.teillet.territoire.dto.TerritoryDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.service.ICityService;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;

import static com.teillet.territoire.utils.GeoJsonUtils.convertToGeoJSON;

public class TerritoryMapper {
	public static TerritoryDto toDto(Territory territory) throws IOException {
		TerritoryDto territoryDto = new TerritoryDto();
		territoryDto.setId(territory.getId().toString());
		territoryDto.setName(territory.getName());
		territoryDto.setStatus(territory.getStatus());
		territoryDto.setLastModifiedDate(territory.getLastModifiedDate().toString());
		territoryDto.setCity(territory.getCity().getName());
		territoryDto.setAddressesNotToDo(new ArrayList<>(territory.getAddressesNotToDo()));
		territoryDto.setAssignments(new ArrayList<>(territory.getAssignments()));
		territoryDto.setNote(territory.getNote());
		territoryDto.setGeojson(convertToGeoJSON(territory.getBlocks(), territory.getConcaveHull()));
		return territoryDto;
	}

	public static Territory fromDto(AddTerritoryDto addTerritoryDto, ICityService cityService) {
		Territory territory = new Territory();
		territory.setName(addTerritoryDto.getName());
		territory.setCity(cityService.getCity(addTerritoryDto.getCityId()));
		territory.setLastModifiedDate(LocalDate.now());
		territory.setStatus(TerritoryStatus.AVAILABLE);
		return territory;
	}
}
