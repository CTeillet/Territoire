package com.teillet.territoire.dto;

import com.teillet.territoire.enums.TerritoryStatus;

public interface TerritoryStatisticsProjection {
	TerritoryStatus getStatus();
	int getTotal();
}
