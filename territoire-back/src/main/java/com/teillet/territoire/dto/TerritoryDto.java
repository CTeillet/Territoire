package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.AddressNotToDo;
import com.teillet.territoire.model.Assignment;
import lombok.Data;

import java.util.List;

@Data
public class TerritoryDto {
	private String id;
	private String name;
	private TerritoryStatus status;
	private String lastModifiedDate;
	private String city;
	private List<AddressNotToDo> addressesNotToDo;
	private List<Assignment> assignments;
	private String geojson;
	private String note;
}
