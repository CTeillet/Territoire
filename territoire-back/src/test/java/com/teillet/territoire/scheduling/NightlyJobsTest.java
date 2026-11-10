package com.teillet.territoire.scheduling;

import com.teillet.territoire.service.IAssignmentService;
import com.teillet.territoire.service.IRefreshTokenService;
import com.teillet.territoire.service.ITerritoryService;
import com.teillet.territoire.service.ITerritoryStatusHistoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NightlyJobsTest {

	@Mock
	private IAssignmentService assignmentService;

	@Mock
	private ITerritoryService territoryService;

	@Mock
	private ITerritoryStatusHistoryService territoryStatusHistoryService;

	@Mock
	private IRefreshTokenService refreshTokenService;

	@Mock
	private HealthcheckPing healthcheck;

	@InjectMocks
	private NightlyJobs nightlyJobs;

	@Test
	void runsStepsInOrder() {
		nightlyJobs.run();

		InOrder order = inOrder(assignmentService, territoryService, territoryStatusHistoryService, refreshTokenService,
				healthcheck);
		order.verify(assignmentService).checkOverdueAssignments();
		order.verify(territoryService).releasePendingTerritories();
		order.verify(territoryStatusHistoryService).recordDailyStatistics();
		order.verify(refreshTokenService).purgeExpired();
		order.verify(healthcheck).report(true);
	}

	@Test
	void failingStepDoesNotStopTheOthers() {
		doThrow(new RuntimeException("boom")).when(assignmentService).checkOverdueAssignments();
		doThrow(new RuntimeException("boom")).when(territoryService).releasePendingTerritories();

		assertDoesNotThrow(() -> nightlyJobs.run());

		verify(territoryStatusHistoryService).recordDailyStatistics();
		verify(refreshTokenService).purgeExpired();
		// Le service de surveillance est prévenu de l'échec
		verify(healthcheck).report(false);
	}
}
