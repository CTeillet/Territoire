package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.AddressNotToDo;
import lombok.Data;

import java.util.List;

@Data
public class TerritoryDto {
	private String id;
	private String name;
	private TerritoryStatus status;
	private TerritoryType type;
	private String lastModifiedDate;
	private CityDto city;
	private List<AddressNotToDo> addressesNotToDo;
	private List<AssignmentDto> assignments;
	private String geojson;
	private String note;
	private String lastVisitedOn;
	private String assignedTo;
	private String assignedOn;
	private String waitedFor;
	private String territoryMapId; // ID to use for retrieving the map image
}
