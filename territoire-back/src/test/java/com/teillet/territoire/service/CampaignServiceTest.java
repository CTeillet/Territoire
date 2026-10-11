package com.teillet.territoire.service;

import com.teillet.territoire.dto.CampaignDto;
import com.teillet.territoire.dto.CampaignStatisticsDto;
import com.teillet.territoire.dto.SimplifiedTerritoryDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.model.Campaign;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.repository.CampaignRepository;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.service.impl.CampaignService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CampaignServiceTest {

	@Mock
	private CampaignRepository campaignRepository;

	@Mock
	private TerritoryRepository territoryRepository;

	@Mock
	private IAssignmentService assignmentService;

	private CampaignService campaignService;

	private City city;
	private Territory territory1;
	private Territory territory2;

	@BeforeEach
	void setUp() {
		campaignService = new CampaignService(campaignRepository, territoryRepository, assignmentService);

		city = new City();
		city.setId(UUID.randomUUID());
		city.setName("Paris");

		territory1 = new Territory();
		territory1.setId(UUID.randomUUID());
		territory1.setName("T1");
		territory1.setType(TerritoryType.BUILDING);
		territory1.setCity(city);
		territory1.setStatus(TerritoryStatus.AVAILABLE);

		territory2 = new Territory();
		territory2.setId(UUID.randomUUID());
		territory2.setName("T2");
		territory2.setType(TerritoryType.HOUSE);
		territory2.setCity(city);
		territory2.setStatus(TerritoryStatus.AVAILABLE);
	}

	@Test
	void testGetAllCampaigns() {
		Campaign c1 = new Campaign();
		c1.setId(UUID.randomUUID());
		c1.setName("C1");
		c1.setTerritories(new ArrayList<>());
		c1.setRemainingTerritories(new ArrayList<>());

		when(campaignRepository.findAllByOrderByStartDateDesc()).thenReturn(List.of(c1));

		List<CampaignDto> results = campaignService.getAllCampaigns();
		assertEquals(1, results.size());
		assertEquals("C1", results.getFirst().getName());
	}

	@Test
	void testGetCampaignById_Found() {
		UUID campaignId = UUID.randomUUID();
		Campaign c = new Campaign();
		c.setId(campaignId);
		c.setName("C1");
		c.setTerritories(new ArrayList<>());
		c.setRemainingTerritories(new ArrayList<>());

		when(campaignRepository.findById(campaignId)).thenReturn(Optional.of(c));

		CampaignDto result = campaignService.getCampaignById(campaignId);
		assertNotNull(result);
		assertEquals("C1", result.getName());
	}

	@Test
	void testGetCampaignById_NotFound() {
		UUID campaignId = UUID.randomUUID();
		when(campaignRepository.findById(campaignId)).thenReturn(Optional.empty());

		assertThrows(RuntimeException.class, () -> campaignService.getCampaignById(campaignId));
	}

	@Test
	void testCreateCampaign_Success() {
		CampaignDto dto = CampaignDto.builder()
				.name("Campagne Printemps")
				.startDate(LocalDate.of(2024, 3, 1))
				.endDate(LocalDate.of(2024, 4, 1))
				.build();

		when(territoryRepository.findAll()).thenReturn(List.of(territory1, territory2));
		when(campaignRepository.save(any(Campaign.class))).thenAnswer(invocation -> {
			Campaign c = invocation.getArgument(0);
			c.setId(UUID.randomUUID());
			return c;
		});

		CampaignDto result = campaignService.createCampaign(dto);
		assertNotNull(result);
		assertEquals("Campagne Printemps", result.getName());
		assertEquals(2, result.getTerritories().size());
	}

	@Test
	void testCreateCampaign_InvalidDates_ThrowsException() {
		CampaignDto nullEndDate = CampaignDto.builder()
				.name("Campagne")
				.startDate(LocalDate.of(2024, 3, 1))
				.endDate(null)
				.build();

		assertThrows(IllegalArgumentException.class, () -> campaignService.createCampaign(nullEndDate));

		CampaignDto endBeforeStart = CampaignDto.builder()
				.name("Campagne")
				.startDate(LocalDate.of(2024, 4, 1))
				.endDate(LocalDate.of(2024, 3, 1))
				.build();

		assertThrows(IllegalArgumentException.class, () -> campaignService.createCampaign(endBeforeStart));
	}

	@Test
	void testUpdateRemainingTerritories() {
		UUID campaignId = UUID.randomUUID();
		Campaign campaign = new Campaign();
		campaign.setId(campaignId);
		campaign.setName("C1");
		campaign.setTerritories(new ArrayList<>(List.of(territory1, territory2)));
		campaign.setRemainingTerritories(new ArrayList<>(List.of(territory1, territory2)));

		when(campaignRepository.findById(campaignId)).thenReturn(Optional.of(campaign));
		when(territoryRepository.findById(territory1.getId())).thenReturn(Optional.of(territory1));
		when(campaignRepository.save(any(Campaign.class))).thenAnswer(invocation -> invocation.getArgument(0));

		SimplifiedTerritoryDto simplifiedDto = SimplifiedTerritoryDto.builder()
				.territoryId(territory1.getId())
				.name(territory1.getName())
				.build();

		CampaignDto updated = campaignService.updateRemainingTerritories(campaignId, List.of(simplifiedDto));
		assertNotNull(updated);
		assertEquals(1, updated.getRemainingTerritories().size());
	}

	@Test
	void testCloseCampaign_Success() {
		UUID campaignId = UUID.randomUUID();
		Campaign campaign = new Campaign();
		campaign.setId(campaignId);
		campaign.setName("C1");
		campaign.setClosed(false);
		campaign.setTerritories(new ArrayList<>(List.of(territory1, territory2)));
		campaign.setRemainingTerritories(new ArrayList<>(List.of(territory1)));

		when(campaignRepository.findById(campaignId)).thenReturn(Optional.of(campaign));
		when(campaignRepository.save(any(Campaign.class))).thenAnswer(invocation -> invocation.getArgument(0));

		CampaignDto closedDto = campaignService.closeCampaign(campaignId);
		assertTrue(closedDto.isClosed());
		verify(assignmentService, times(1)).createCampaignAssignments(campaign, List.of(territory2));
	}

	@Test
	void testCloseCampaign_AlreadyClosed_ThrowsException() {
		UUID campaignId = UUID.randomUUID();
		Campaign campaign = new Campaign();
		campaign.setId(campaignId);
		campaign.setClosed(true);

		when(campaignRepository.findById(campaignId)).thenReturn(Optional.of(campaign));

		assertThrows(RuntimeException.class, () -> campaignService.closeCampaign(campaignId));
		verify(assignmentService, never()).createCampaignAssignments(any(), any());
	}

	@Test
	void testDeleteCampaign_NotClosed() {
		UUID campaignId = UUID.randomUUID();
		Campaign campaign = new Campaign();
		campaign.setId(campaignId);
		campaign.setClosed(false);

		when(campaignRepository.findById(campaignId)).thenReturn(Optional.of(campaign));

		campaignService.deleteCampaign(campaignId);
		verify(campaignRepository, times(1)).delete(campaign);
	}

	@Test
	void testDeleteCampaign_Closed_ThrowsException() {
		UUID campaignId = UUID.randomUUID();
		Campaign campaign = new Campaign();
		campaign.setId(campaignId);
		campaign.setClosed(true);

		when(campaignRepository.findById(campaignId)).thenReturn(Optional.of(campaign));

		assertThrows(RuntimeException.class, () -> campaignService.deleteCampaign(campaignId));
		verify(campaignRepository, never()).delete(any());
	}

	@Test
	void testGetCampaignStatistics() {
		UUID campaignId = UUID.randomUUID();
		Campaign campaign = new Campaign();
		campaign.setId(campaignId);
		campaign.setName("C1");
		campaign.setTerritories(List.of(territory1, territory2));
		campaign.setRemainingTerritories(List.of(territory1)); // territory1 is available, territory2 is used

		when(campaignRepository.findById(campaignId)).thenReturn(Optional.of(campaign));

		CampaignStatisticsDto stats = campaignService.getCampaignStatistics(campaignId);
		assertNotNull(stats);
		assertEquals(2, stats.getTotalTerritories());
		assertEquals(1, stats.getUsedTerritories());
		assertEquals(1, stats.getAvailableTerritories());

		assertEquals(1, stats.getTotalTerritoriesByType().get(TerritoryType.BUILDING));
		assertEquals(1, stats.getTotalTerritoriesByType().get(TerritoryType.HOUSE));
		assertEquals(1, stats.getUsedTerritoriesByType().get(TerritoryType.HOUSE));
		assertEquals(1, stats.getAvailableTerritoriesByType().get(TerritoryType.BUILDING));

		assertEquals(2, stats.getTotalTerritoriesByCity().get("Paris"));
		assertEquals(1, stats.getUsedTerritoriesByCity().get("Paris"));
		assertEquals(1, stats.getAvailableTerritoriesByCity().get("Paris"));
	}

	@Test
	void testDeleteTerritoryFromAllCampaign() {
		Campaign c1 = new Campaign();
		c1.setId(UUID.randomUUID());
		c1.setTerritories(new ArrayList<>(List.of(territory1)));
		c1.setRemainingTerritories(new ArrayList<>(List.of(territory1)));

		when(campaignRepository.findByTerritoriesContaining(territory1)).thenReturn(List.of(c1));
		when(campaignRepository.findByRemainingTerritoriesContaining(territory1)).thenReturn(List.of(c1));

		campaignService.deleteTerrritoryFromAllCampaign(territory1);

		assertFalse(c1.getTerritories().contains(territory1));
		assertFalse(c1.getRemainingTerritories().contains(territory1));
		verify(campaignRepository, times(2)).save(c1);
	}
}
