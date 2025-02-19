package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.TerritoryDto;
import com.teillet.territoire.model.Territory;

import java.io.IOException;
import java.util.ArrayList;

import static com.teillet.territoire.utils.GeoJsonUtils.convertToGeoJSON;

public class TerritoryMapper {
	public static TerritoryDto toDto(Territory territory) throws IOException {
		TerritoryDto territoryDto = new TerritoryDto();
		territoryDto.setId(territory.getId().toString());
		territoryDto.setName(territory.getName());
		territoryDto.setStatus(territory.getStatus());
		territoryDto.setLastModifiedDate(territory.getLastModifiedDate().toString());
		territoryDto.setCity(territory.getCity());
		territoryDto.setAddressNotToDo(new ArrayList<>(territory.getAddressNotToDo()));
		territoryDto.setAssignments(new ArrayList<>(territory.getAssignments()));
		territoryDto.setNote(territory.getNote());
		territoryDto.setGeojson(convertToGeoJSON(territory.getBlocks(), territory.getConcaveHull()));
		return territoryDto;
	}
}
