package com.teillet.territoire.service;

import com.teillet.territoire.dto.DurationSettingsDto;
import com.teillet.territoire.dto.MapThemeSettingsDto;
import com.teillet.territoire.enums.MapView;
import com.teillet.territoire.enums.PlanTheme;
import com.teillet.territoire.model.Setting;
import com.teillet.territoire.repository.SettingRepository;
import com.teillet.territoire.service.impl.SettingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SettingServiceTest {

	@Mock
	private SettingRepository settingRepository;

	@InjectMocks
	private SettingService settingService;

	private Setting setting;

	@BeforeEach
	void setUp() {
		setting = Setting.builder()
				.publishersCount(42)
				.lateReminderMessage("Rappel de territoire en retard")
				.build();
	}

	@Test
	void testGetPublishersCount_Existing() {
		when(settingRepository.findAll()).thenReturn(List.of(setting));

		Integer count = settingService.getPublishersCount();
		assertEquals(42, count);
	}

	@Test
	void testGetPublishersCount_Empty_CreatesDefault() {
		when(settingRepository.findAll()).thenReturn(Collections.emptyList());
		when(settingRepository.save(any(Setting.class))).thenAnswer(inv -> inv.getArgument(0));

		Integer count = settingService.getPublishersCount();
		assertEquals(0, count);
	}

	@Test
	void testUpdatePublishersCount() {
		when(settingRepository.findAll()).thenReturn(List.of(setting));
		when(settingRepository.save(any(Setting.class))).thenAnswer(inv -> inv.getArgument(0));

		Integer updated = settingService.updatePublishersCount(50);
		assertEquals(50, updated);
		verify(settingRepository).save(setting);
	}

	@Test
	void testMapThemes_DefaultsForEveryMap() {
		when(settingRepository.findAll()).thenReturn(List.of(setting));

		Map<MapView, List<PlanTheme>> maps = settingService.getMapThemes().getMaps();

		assertEquals(MapView.values().length, maps.size());
		// À l'écran : tout sauf le relief et le cadastre ; carte physique : les seuls repères
		assertFalse(maps.get(MapView.TERRITORY).contains(PlanTheme.CADASTRE));
		assertTrue(maps.get(MapView.TERRITORY).contains(PlanTheme.HOUSES));
		assertEquals(List.of(PlanTheme.PLACES, PlanTheme.BUILDINGS), maps.get(MapView.CARD));
	}

	@Test
	void testUpdateMapThemes_KeepsOtherMapsAndOrdersThemes() {
		when(settingRepository.findAll()).thenReturn(List.of(setting));
		when(settingRepository.save(any(Setting.class))).thenAnswer(inv -> inv.getArgument(0));

		settingService.updateMapThemes(new MapThemeSettingsDto(Map.of(
				MapView.PUBLIC, List.of(PlanTheme.NUMBERS, PlanTheme.PLACES, PlanTheme.NUMBERS))));

		assertEquals(List.of(PlanTheme.PLACES, PlanTheme.NUMBERS), settingService.getMapThemes(MapView.PUBLIC));
		assertEquals(List.of(PlanTheme.PLACES, PlanTheme.BUILDINGS), settingService.getMapThemes(MapView.CARD));
		verify(settingRepository).save(setting);

		// Une carte vidée ne montre plus que les rues
		settingService.updateMapThemes(new MapThemeSettingsDto(Map.of(MapView.PUBLIC, List.of())));
		assertEquals(List.of(), settingService.getMapThemes(MapView.PUBLIC));
	}

	@Test
	void testMapThemes_UnreadableJsonFallsBackToDefaults() {
		setting.setMapThemes("pas du JSON");
		when(settingRepository.findAll()).thenReturn(List.of(setting));

		assertEquals(List.of(PlanTheme.PLACES, PlanTheme.BUILDINGS), settingService.getMapThemes(MapView.CARD));
	}

	@Test
	void testDurationSettings_DefaultsThenUpdate() {
		when(settingRepository.findAll()).thenReturn(List.of(setting));
		when(settingRepository.save(any(Setting.class))).thenAnswer(inv -> inv.getArgument(0));

		DurationSettingsDto defaults = settingService.getDurationSettings();
		assertEquals(4, defaults.getAssignmentDurationMonths());
		assertEquals(4, defaults.getPendingDurationMonths());

		DurationSettingsDto updated = settingService.updateDurationSettings(new DurationSettingsDto(3, 6));
		assertEquals(3, updated.getAssignmentDurationMonths());
		assertEquals(6, updated.getPendingDurationMonths());
		assertEquals(3, setting.getAssignmentDurationMonths());
		assertEquals(6, setting.getPendingDurationMonths());
		verify(settingRepository).save(setting);
	}

	@Test
	void testGetLateReminderMessage_Existing() {
		when(settingRepository.findAll()).thenReturn(List.of(setting));

		String msg = settingService.getLateReminderMessage();
		assertEquals("Rappel de territoire en retard", msg);
	}

	@Test
	void testUpdateLateReminderMessage() {
		when(settingRepository.findAll()).thenReturn(List.of(setting));
		when(settingRepository.save(any(Setting.class))).thenAnswer(inv -> inv.getArgument(0));

		String updated = settingService.updateLateReminderMessage("Nouveau message");
		assertEquals("Nouveau message", updated);
		verify(settingRepository).save(setting);
	}

	@Test
	void testGetLateReportRecipients() {
		when(settingRepository.findAll()).thenReturn(List.of(setting));
		assertEquals(List.of(), settingService.getLateReportRecipients());

		setting.setLateReportRecipients("a@b.fr, c@d.fr,");
		assertEquals(List.of("a@b.fr", "c@d.fr"), settingService.getLateReportRecipients());
	}

	@Test
	void testUpdateLateReportRecipients_TrimsAndRemovesDuplicates() {
		when(settingRepository.findAll()).thenReturn(List.of(setting));
		when(settingRepository.save(any(Setting.class))).thenAnswer(inv -> inv.getArgument(0));

		List<String> updated = settingService.updateLateReportRecipients(Arrays.asList(" a@b.fr ", "", null, "c@d.fr", "a@b.fr"));

		assertEquals(List.of("a@b.fr", "c@d.fr"), updated);
		assertEquals("a@b.fr,c@d.fr", setting.getLateReportRecipients());
	}

	@Test
	void testUpdateLateReportRecipients_EmptyDisables() {
		setting.setLateReportRecipients("a@b.fr");
		when(settingRepository.findAll()).thenReturn(List.of(setting));
		when(settingRepository.save(any(Setting.class))).thenAnswer(inv -> inv.getArgument(0));

		assertEquals(List.of(), settingService.updateLateReportRecipients(List.of()));
		assertNull(setting.getLateReportRecipients());
	}
}
