package com.teillet.territoire.scheduling;

import com.teillet.territoire.service.ILateTerritoryReportService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WeeklyJobsTest {

	@Mock
	private ILateTerritoryReportService lateTerritoryReportService;

	@InjectMocks
	private WeeklyJobs weeklyJobs;

	@Test
	void sendsTheLateTerritoryReport() {
		weeklyJobs.sendLateTerritoryReport();

		verify(lateTerritoryReportService).sendWeeklyReport();
	}

	@Test
	void aFailedSendIsOnlyLogged() {
		doThrow(new IllegalStateException("boom")).when(lateTerritoryReportService).sendWeeklyReport();

		assertDoesNotThrow(() -> weeklyJobs.sendLateTerritoryReport());
	}
}
