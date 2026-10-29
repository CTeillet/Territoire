package com.teillet.territoire.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teillet.territoire.dto.TerritoryDto;
import com.teillet.territoire.enums.TerritoryStatus;
import com.teillet.territoire.enums.TerritoryType;
import com.teillet.territoire.mapper.TerritoryMapper;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.service.ITerritoryService;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * L'image de carte d'un territoire (jusqu'à 5 Mo) n'est lue que quand on la demande :
 * les listes de territoires ne la chargent pas, et modifier un territoire ne l'efface pas.
 * Même configuration que TerritoryControllerIntegrationTest, pour réutiliser son contexte Spring.
 */
@SpringBootTest
@AutoConfigureMockMvc
class TerritoryMapLazyLoadingIntegrationTest {
	private static final byte[] MAP = {(byte) 0x89, 'P', 'N', 'G', 1, 2, 3};

	@Autowired private TerritoryRepository territoryRepository;
	@Autowired private CityRepository cityRepository;
	@Autowired private PersonRepository personRepository;
	@Autowired private AssignmentRepository assignmentRepository;
	@Autowired private AddressNotToDoRepository addressNotToDoRepository;
	@Autowired private TerritoryReminderRepository territoryReminderRepository;
	@Autowired private ITerritoryService territoryService;
	@Autowired private PlatformTransactionManager transactionManager;
	@Autowired private ObjectMapper objectMapper;

	private TransactionTemplate transaction;
	private UUID territoryId;

	/** Base H2 partagée entre les classes de test : nettoyée avant et après chaque test. */
	@AfterEach
	void cleanUp() {
		territoryReminderRepository.deleteAll();
		addressNotToDoRepository.deleteAll();
		assignmentRepository.deleteAll();
		territoryRepository.deleteAll();
		personRepository.deleteAll();
		cityRepository.deleteAll();
	}

	@BeforeEach
	void setUp() {
		cleanUp();
		transaction = new TransactionTemplate(transactionManager);

		City city = cityRepository.save(City.builder()
				.name("Rennes")
				.zipCode("35000")
				.center(new GeometryFactory(new PrecisionModel(), 4326).createPoint(new Coordinate(-1.6777, 48.1173)))
				.build());
		Territory territory = new Territory();
		territory.setName("Territoire avec carte");
		territory.setCity(city);
		territory.setStatus(TerritoryStatus.AVAILABLE);
		territory.setType(TerritoryType.HOUSE);
		territory.setLastModifiedDate(LocalDate.now());
		territory.setTerritoryMap(MAP);
		territory.setTerritoryMapName("carte.png");
		territory.setTerritoryMapContentType("image/png");
		territoryId = territoryRepository.save(territory).getId();
	}

	@Test
	void listingTerritoriesDoesNotLoadTheMap() {
		transaction.executeWithoutResult(status -> {
			Territory territory = territoryRepository.findAll().getFirst();
			TerritoryDto dto = toDto(territory);

			assertEquals(territoryId.toString(), dto.getTerritoryMapId());
			assertFalse(Hibernate.isPropertyInitialized(territory, "territoryMap"),
					"La carte ne doit pas être lue avec la liste des territoires");
		});
	}

	@Test
	void mapIsLoadedWhenRequested() {
		assertMapKept();
	}

	@Test
	void updatingATerritoryKeepsItsMap() {
		transaction.executeWithoutResult(status -> territoryRepository.findById(territoryId).orElseThrow().setName("Renommé"));

		assertEquals("Renommé", territoryRepository.findById(territoryId).orElseThrow().getName());
		assertMapKept();
	}

	@Test
	void savingADetachedTerritoryKeepsItsMap() {
		Territory detached = territoryRepository.findById(territoryId).orElseThrow();
		detached.setNote("Note ajoutée");
		territoryRepository.save(detached);

		assertEquals("Note ajoutée", territoryRepository.findById(territoryId).orElseThrow().getNote());
		assertMapKept();
	}

	@Test
	void territoryJsonHasNeitherTheMapNorHibernateInternals() {
		String json = transaction.execute(status -> {
			try {
				return objectMapper.writeValueAsString(territoryRepository.findById(territoryId).orElseThrow());
			} catch (IOException e) {
				throw new IllegalStateException(e);
			}
		});

		assertTrue(json.contains("\"territoryMapName\":\"carte.png\""), json);
		assertFalse(json.contains("\"territoryMap\""), json);
		assertFalse(json.contains("$$_hibernate"), json);
	}

	/** H2 range la carte dans une colonne BINARY(255), complétée par des zéros (bytea de taille exacte sous PostgreSQL). */
	private void assertMapKept() {
		byte[] map = territoryService.getTerritoryWithMap(territoryId).getTerritoryMap();
		assertNotNull(map, "La carte a disparu");
		assertArrayEquals(MAP, Arrays.copyOf(map, MAP.length));
	}

	private static TerritoryDto toDto(Territory territory) {
		try {
			return TerritoryMapper.toDto(territory);
		} catch (IOException e) {
			throw new IllegalStateException(e);
		}
	}
}
