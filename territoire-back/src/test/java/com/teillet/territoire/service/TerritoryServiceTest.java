package com.teillet.territoire.service;

import com.teillet.territoire.dto.AverageAssignmentDurationDto;
import com.teillet.territoire.dto.DurationSettingsDto;
import com.teillet.territoire.dto.SchoolYearPeriodDto;
import com.teillet.territoire.dto.TerritoryDistributionByCityDto;
import com.teillet.territoire.dto.TerritoryPeriodStatisticsDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.model.TerritoryReminder;
import com.teillet.territoire.repository.AssignmentRepository;
import com.teillet.territoire.repository.BlockRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.service.impl.TerritoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TerritoryServiceTest {

	@Mock
	private TerritoryRepository territoryRepository;

	@Mock
	private com.teillet.territoire.repository.TerritoryReminderRepository reminderRepository;

	@Mock
	private BlockRepository blockRepository;

	@Mock
	private AssignmentRepository assignmentRepository;

	@Mock
	private ICampaignService campaignService;

	@Mock
	private ICityService cityService;

	@Mock
	private ISettingService settingService;

	private TerritoryService territoryService;

	private City city;
	private Territory territory;
	private UUID territoryId;

	@BeforeEach
	void setUp() {
		territoryService = new TerritoryService(
				territoryRepository,
				blockRepository,
				assignmentRepository,
				campaignService,
				cityService,
				reminderRepository,
				settingService
		);
		lenient().when(settingService.getDurationSettings()).thenReturn(new DurationSettingsDto(4, 4));

		territoryId = UUID.randomUUID();

		city = new City();
		city.setId(UUID.randomUUID());
		city.setName("Paris");

		territory = new Territory();
		territory.setId(territoryId);
		territory.setName("T1");
		territory.setType(TerritoryType.HOUSE);
		territory.setStatus(TerritoryStatus.AVAILABLE);
		territory.setCity(city);
	}

	@Test
	void testGetTerritory_Found() {
		when(territoryRepository.findById(territoryId)).thenReturn(Optional.of(territory));

		Territory result = territoryService.getTerritory(territoryId);
		assertNotNull(result);
		assertEquals("T1", result.getName());
	}

	@Test
	void testGetTerritory_NotFound() {
		when(territoryRepository.findById(territoryId)).thenReturn(Optional.empty());

		assertThrows(RuntimeException.class, () -> territoryService.getTerritory(territoryId));
	}

	@Test
	void testSaveTerritory() {
		when(territoryRepository.save(any(Territory.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Territory saved = territoryService.saveTerritory(territory);
		assertNotNull(saved);
		assertEquals(LocalDate.now(), saved.getLastModifiedDate());
	}

	@Test
	void testUpdateTerritoryStatus() {
		when(territoryRepository.save(any(Territory.class))).thenAnswer(invocation -> invocation.getArgument(0));

		territoryService.updateTerritoryStatus(territory, TerritoryStatus.ASSIGNED);
		assertEquals(TerritoryStatus.ASSIGNED, territory.getStatus());
		verify(territoryRepository, times(1)).save(territory);
	}

	@Test
	void testReleasePendingTerritories() {
		Assignment oldAssignment = Assignment.builder()
				.returnDate(LocalDate.now().minusMonths(5))
				.build();

		Territory pendingTerritory = new Territory();
		pendingTerritory.setId(UUID.randomUUID());
		pendingTerritory.setStatus(TerritoryStatus.PENDING);
		pendingTerritory.setAssignments(List.of(oldAssignment));

		when(territoryRepository.findByStatus(TerritoryStatus.PENDING)).thenReturn(List.of(pendingTerritory));
		when(territoryRepository.save(any(Territory.class))).thenAnswer(invocation -> invocation.getArgument(0));

		territoryService.releasePendingTerritories();

		assertEquals(TerritoryStatus.AVAILABLE, pendingTerritory.getStatus());
		verify(territoryRepository, times(1)).save(pendingTerritory);
	}

	@Test
	void testReleasePendingTerritories_UsesPendingDurationSetting() {
		when(settingService.getDurationSettings()).thenReturn(new DurationSettingsDto(4, 6));
		Territory returnedFiveMonthsAgo = new Territory();
		returnedFiveMonthsAgo.setId(UUID.randomUUID());
		returnedFiveMonthsAgo.setStatus(TerritoryStatus.PENDING);
		returnedFiveMonthsAgo.setAssignments(List.of(Assignment.builder().returnDate(LocalDate.now().minusMonths(5)).build()));
		when(territoryRepository.findByStatus(TerritoryStatus.PENDING)).thenReturn(List.of(returnedFiveMonthsAgo));

		territoryService.releasePendingTerritories();

		// Attente de 6 mois : rendu il y a 5 mois, le territoire reste en attente
		assertEquals(TerritoryStatus.PENDING, returnedFiveMonthsAgo.getStatus());
		verify(territoryRepository, never()).save(any(Territory.class));
	}

	@Test
	void testReleasePendingTerritories_RobustToMissingReturnDates() {
		// Territoire en attente sans aucune attribution : ne doit plus faire échouer le traitement
		Territory withoutAssignment = new Territory();
		withoutAssignment.setId(UUID.randomUUID());
		withoutAssignment.setName("Sans attribution");
		withoutAssignment.setStatus(TerritoryStatus.PENDING);
		withoutAssignment.setAssignments(List.of());

		// Attribution récente + attribution sans date de retour : la plus récente date non nulle fait foi
		Territory recentlyReturned = new Territory();
		recentlyReturned.setId(UUID.randomUUID());
		recentlyReturned.setStatus(TerritoryStatus.PENDING);
		recentlyReturned.setAssignments(List.of(
				Assignment.builder().returnDate(null).build(),
				Assignment.builder().returnDate(LocalDate.now().minusMonths(1)).build()));

		Territory oldReturned = new Territory();
		oldReturned.setId(UUID.randomUUID());
		oldReturned.setStatus(TerritoryStatus.PENDING);
		oldReturned.setAssignments(List.of(
				Assignment.builder().returnDate(null).build(),
				Assignment.builder().returnDate(LocalDate.now().minusMonths(6)).build()));

		when(territoryRepository.findByStatus(TerritoryStatus.PENDING))
				.thenReturn(List.of(withoutAssignment, recentlyReturned, oldReturned));
		when(territoryRepository.save(any(Territory.class))).thenAnswer(invocation -> invocation.getArgument(0));

		assertDoesNotThrow(() -> territoryService.releasePendingTerritories());

		assertEquals(TerritoryStatus.PENDING, withoutAssignment.getStatus());
		assertEquals(TerritoryStatus.PENDING, recentlyReturned.getStatus());
		assertEquals(TerritoryStatus.AVAILABLE, oldReturned.getStatus());
		verify(territoryRepository, times(1)).save(any(Territory.class));
	}

	@Test
	void testDeleteTerritory_DetachesFromReminders() {
		TerritoryReminder reminder = TerritoryReminder.builder().territories(new java.util.ArrayList<>(List.of(territory))).build();
		when(territoryRepository.findById(territoryId)).thenReturn(Optional.of(territory));
		when(reminderRepository.findByTerritories_Id(territoryId)).thenReturn(List.of(reminder));

		territoryService.deleteTerritory(territoryId);

		assertTrue(reminder.getTerritories().isEmpty());
		verify(reminderRepository).save(reminder);
		verify(territoryRepository).deleteById(territoryId);
	}

	@Test
	void testDeleteTerritory() {
		when(territoryRepository.findById(territoryId)).thenReturn(Optional.of(territory));

		territoryService.deleteTerritory(territoryId);

		verify(campaignService, times(1)).deleteTerrritoryFromAllCampaign(territory);
		verify(blockRepository, times(1)).deleteBlockByTerritory_Id(territoryId);
		verify(assignmentRepository, times(1)).deleteByTerritory_Id(territoryId);
		verify(territoryRepository, times(1)).deleteById(territoryId);
	}

	@Test
	void testGetPeriodStatistics() {
		LocalDate start = LocalDate.of(2024, 1, 1);
		LocalDate end = LocalDate.of(2024, 6, 1);

		when(territoryRepository.findAllIdTypeAndCityName()).thenReturn(List.<Object[]>of(new Object[]{territoryId, TerritoryType.BUILDING, "Paris"}));
		when(territoryRepository.findTerritoryIdsNotAssignedBetween(start, end)).thenReturn(List.of(territoryId));

		TerritoryPeriodStatisticsDto stats = territoryService.getPeriodStatistics(start, end);
		assertNotNull(stats);
		assertEquals(1, stats.getTotalTerritories());
		assertEquals(0, stats.getUsedTerritories());
		assertEquals(1, stats.getAvailableTerritories());
	}

	@Test
	void testGetAverageAssignmentDurationByMonth() {
		LocalDate start = LocalDate.of(2024, 1, 1);
		LocalDate end = LocalDate.of(2024, 3, 1);

		// 10 jours entre l'attribution et le retour
		Object[] a1 = new Object[]{LocalDate.of(2024, 1, 10), LocalDate.of(2024, 1, 20)};

		when(assignmentRepository.findReturnedAssignmentDatesBetween(start, end)).thenReturn(List.<Object[]>of(a1));

		List<AverageAssignmentDurationDto> result = territoryService.getAverageAssignmentDurationByMonth(start, end);
		assertEquals(1, result.size());
		assertEquals(YearMonth.of(2024, 1), result.getFirst().getPeriod());
		assertEquals(10.0, result.getFirst().getAverageDuration());
	}

	@Test
	void testGetTerritoryDistributionByCity() {
		LocalDate start = LocalDate.of(2024, 1, 1);
		LocalDate end = LocalDate.of(2024, 6, 1);

		Object[] row = new Object[]{"Paris", 5L, 50.0};
		when(territoryRepository.calculateTerritoryDistributionByCity(start, end)).thenReturn(List.<Object[]>of(row));

		List<TerritoryDistributionByCityDto> list = territoryService.getTerritoryDistributionByCity(start, end);
		assertEquals(1, list.size());
		assertEquals("Paris", list.getFirst().getCityName());
		assertEquals(5L, list.getFirst().getTerritoryCount());
		assertEquals(50.0, list.getFirst().getPercentage());
	}

	@Test
	void testGetAvailableSchoolYears() {
		when(assignmentRepository.findMinAssignmentDate()).thenReturn(LocalDate.of(2022, 10, 1));

		List<SchoolYearPeriodDto> periods = territoryService.getAvailableSchoolYears();
		assertFalse(periods.isEmpty());
		assertTrue(periods.getFirst().isCurrent());
	}

	@Test
	void testUploadTerritoryMap() throws IOException {
		MockMultipartFile file = new MockMultipartFile("file", "map.png", "image/png", new byte[]{1, 2, 3});
		when(territoryRepository.findById(territoryId)).thenReturn(Optional.of(territory));
		when(territoryRepository.save(any(Territory.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Territory updated = territoryService.uploadTerritoryMap(territoryId, file);
		assertNotNull(updated);
		assertArrayEquals(new byte[]{1, 2, 3}, updated.getTerritoryMap());
		assertEquals("map.png", updated.getTerritoryMapName());
		assertEquals("image/png", updated.getTerritoryMapContentType());
	}

	@Test
	void testUploadTerritoryMap_RejectsSvg() {
		MockMultipartFile file = new MockMultipartFile("file", "map.svg", "image/svg+xml", new byte[]{1});

		assertThrows(IllegalArgumentException.class, () -> territoryService.uploadTerritoryMap(territoryId, file));
		verify(territoryRepository, never()).save(any());
	}

	@Test
	void testUploadTerritoryMap_RejectsTooLargeFile() {
		MockMultipartFile file = new MockMultipartFile("file", "map.png", "image/png", new byte[5 * 1024 * 1024 + 1]);

		assertThrows(IllegalArgumentException.class, () -> territoryService.uploadTerritoryMap(territoryId, file));
		verify(territoryRepository, never()).save(any());
	}
}
