package com.teillet.territoire.service;

import com.teillet.territoire.dto.TerritoryStatusHistoryDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.model.TerritoryStatusHistory;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.repository.TerritoryStatusHistoryRepository;
import com.teillet.territoire.repository.projection.TerritoryStatisticsProjection;
import com.teillet.territoire.service.impl.TerritoryStatusHistoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TerritoryStatusHistoryServiceTest {

	@Mock
	private TerritoryRepository territoryRepository;

	@Mock
	private TerritoryStatusHistoryRepository territoryStatusHistoryRepository;

	@InjectMocks
	private TerritoryStatusHistoryService territoryStatusHistoryService;

	private TerritoryStatisticsProjection createProjection(TerritoryStatus status, int total) {
		return new TerritoryStatisticsProjection() {
			@Override
			public TerritoryStatus getStatus() {
				return status;
			}

			@Override
			public int getTotal() {
				return total;
			}
		};
	}

	@Test
	void testRecordDailyStatistics() {
		List<TerritoryStatisticsProjection> stats = List.of(
				createProjection(TerritoryStatus.AVAILABLE, 10),
				createProjection(TerritoryStatus.LATE, 2),
				createProjection(TerritoryStatus.PENDING, 3),
				createProjection(TerritoryStatus.ASSIGNED, 5)
		);
		when(territoryRepository.getCurrentTerritoryStats()).thenReturn(stats);

		territoryStatusHistoryService.recordDailyStatistics();

		ArgumentCaptor<TerritoryStatusHistory> captor = ArgumentCaptor.forClass(TerritoryStatusHistory.class);
		verify(territoryStatusHistoryRepository).save(captor.capture());

		TerritoryStatusHistory saved = captor.getValue();
		assertNotNull(saved);
		assertEquals(LocalDate.now(), saved.getDate());
		assertEquals(10, saved.getAvailableTerritory());
		assertEquals(2, saved.getLateTerritory());
		assertEquals(3, saved.getPendingTerritory());
		assertEquals(5, saved.getAssignedTerritory());
	}

	@Test
	void testRecordDailyStatistics_IsIdempotentForTheSameDay() {
		TerritoryStatusHistory existing = TerritoryStatusHistory.builder()
				.date(LocalDate.now())
				.availableTerritory(1)
				.build();
		when(territoryStatusHistoryRepository.findFirstByDate(LocalDate.now())).thenReturn(java.util.Optional.of(existing));
		when(territoryRepository.getCurrentTerritoryStats()).thenReturn(List.of(createProjection(TerritoryStatus.AVAILABLE, 7)));

		territoryStatusHistoryService.recordDailyStatistics();

		// La ligne du jour est mise à jour au lieu d'en créer une seconde
		verify(territoryStatusHistoryRepository).save(existing);
		assertEquals(7, existing.getAvailableTerritory());
	}

	@Test
	void testGetHistoryStatus() {
		LocalDate start = LocalDate.now().minusDays(7);
		LocalDate end = LocalDate.now();

		TerritoryStatusHistory h1 = TerritoryStatusHistory.builder()
				.date(start)
				.availableTerritory(8)
				.assignedTerritory(4)
				.lateTerritory(1)
				.pendingTerritory(0)
				.build();

		when(territoryStatusHistoryRepository.findByDateBetween(start, end)).thenReturn(List.of(h1));

		List<TerritoryStatusHistoryDto> result = territoryStatusHistoryService.getHistoryStatus(start, end);
		assertEquals(1, result.size());
		assertEquals(8, result.getFirst().getAvailableTerritory());
		assertEquals(4, result.getFirst().getAssignedTerritory());
	}
}
