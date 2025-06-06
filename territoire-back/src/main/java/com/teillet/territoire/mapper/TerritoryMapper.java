package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.AddTerritoryDto;
import com.teillet.territoire.dto.TerritoryDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.service.ICityService;
import com.teillet.territoire.utils.TerritoryUtils;

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
		territoryDto.setType(territory.getType());
		territoryDto.setLastModifiedDate(territory.getLastModifiedDate().toString());
		territoryDto.setCity(CityMapper.toDto(territory.getCity()));
		territoryDto.setAddressesNotToDo(new ArrayList<>(territory.getAddressesNotToDo()));
		territoryDto.setAssignments(territory.getAssignments().stream().map(AssignmentMapper::toDto).toList());
		territoryDto.setNote(territory.getNote());
		territoryDto.setGeojson(convertToGeoJSON(territory.getBlocks(), territory.getConcaveHull()));
		territoryDto.setLastVisitedOn(TerritoryUtils.getLastVisitedOn(territory));
		territoryDto.setAssignedTo(TerritoryUtils.getAssignedTo(territory));
		territoryDto.setAssignedOn(TerritoryUtils.getAssignedOn(territory));
		territoryDto.setWaitedFor(TerritoryUtils.getWaitedFor(territory));
		return territoryDto;
	}

	public static Territory fromDto(AddTerritoryDto addTerritoryDto, ICityService cityService) {
		Territory territory = new Territory();
		territory.setName(addTerritoryDto.getName());
		territory.setCity(cityService.getCity(addTerritoryDto.getCityId()));
		territory.setLastModifiedDate(LocalDate.now());
		territory.setStatus(TerritoryStatus.AVAILABLE);
		territory.setType(addTerritoryDto.getType());
		return territory;
	}
}
