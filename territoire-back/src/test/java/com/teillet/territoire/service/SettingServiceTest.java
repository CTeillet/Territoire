package com.teillet.territoire.service;

import com.teillet.territoire.model.Setting;
import com.teillet.territoire.repository.SettingRepository;
import com.teillet.territoire.service.impl.SettingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
}
