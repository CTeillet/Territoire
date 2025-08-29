package com.teillet.territoire.repository.projection;

import com.teillet.territoire.enums.TerritoryStatus;

public interface TerritoryStatisticsProjection {
	TerritoryStatus getStatus();
	int getTotal();
}
