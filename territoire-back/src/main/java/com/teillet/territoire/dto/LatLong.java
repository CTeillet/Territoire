package com.teillet.territoire.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LatLong {
	private double latitude;
	private double longitude;
}
