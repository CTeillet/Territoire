package com.teillet.territoire.dto;

import lombok.Data;
import java.util.List;

@Data
public class BlockDto {
	private List<List<List<Double>>> coordinates; // [[[lng, lat], [lng, lat], ...]]
}
