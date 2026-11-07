package com.teillet.territoire.dto;

import com.teillet.territoire.enums.MapView;
import com.teillet.territoire.enums.PlanTheme;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Thèmes du Plan IGN montrés sur chaque carte de l'application. Lu, chaque carte y figure ; à l'enregistrement,
 * une carte absente garde ses thèmes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MapThemeSettingsDto {
	@NotNull(message = "Les thèmes des cartes sont obligatoires")
	private Map<MapView, List<PlanTheme>> maps;
}
