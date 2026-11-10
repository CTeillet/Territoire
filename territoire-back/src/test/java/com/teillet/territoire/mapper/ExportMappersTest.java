package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.exportExcel.AssignmentExportDto;
import com.teillet.territoire.dto.exportExcel.CityExportDto;
import com.teillet.territoire.dto.exportExcel.TerritoryExportDto;
import com.teillet.territoire.enums.ReturnSource;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.Campaign;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Données du registre des attributions (export Excel) : ordre, année, prolongations, dernier parcours. */
class ExportMappersTest {
	/** Année 2025-2026 : du 1er septembre au 31 août. */
	private static final LocalDate START = LocalDate.of(2025, 9, 1);
	private static final LocalDate END = LocalDate.of(2026, 8, 31);

	private final Person jean = person("Jean", "Dupont");
	private final Person marie = person("Marie", "Martin");

	@Test
	void assignmentsAreInChronologicalOrderAcrossMonthsAndYears() {
		// Données reçues dans le désordre ; en texte JJ/MM/AAAA, « 03/01/2026 » passerait avant « 15/09/2025 »
		Territory territory = territory("T1",
				assignment(marie, LocalDate.of(2026, 1, 3), LocalDate.of(2026, 3, 20), ReturnSource.RESPONSABLE),
				assignment(jean, LocalDate.of(2025, 9, 15), LocalDate.of(2025, 12, 10), ReturnSource.LIEN));

		List<AssignmentExportDto> assignments = ExportMappers.toExportDto(territory, START, END).getAssignments();

		assertEquals(List.of("15/09/2025", "03/01/2026"), assignments.stream().map(AssignmentExportDto::getAssignmentDate).toList());
		assertEquals(List.of("Jean Dupont", "Marie Martin"), assignments.stream().map(AssignmentExportDto::getAssignedToName).toList());
		assertEquals("10/12/2025", assignments.getFirst().getReturnDate());
	}

	@Test
	void onlyAssignmentsOverlappingTheYearAreKept() {
		Territory territory = territory("T1",
				// Rendu avant le début de l'année
				assignment(jean, LocalDate.of(2025, 3, 1), LocalDate.of(2025, 8, 31), ReturnSource.RESPONSABLE),
				// Commencé l'année précédente, rendu pendant l'année
				assignment(marie, LocalDate.of(2025, 6, 1), LocalDate.of(2025, 9, 1), ReturnSource.RESPONSABLE),
				// En cours, commencé pendant l'année
				assignment(jean, LocalDate.of(2026, 5, 2), null, null),
				// Après la fin de l'année
				assignment(marie, LocalDate.of(2026, 9, 1), null, null));

		List<AssignmentExportDto> assignments = ExportMappers.toExportDto(territory, START, END).getAssignments();

		assertEquals(List.of("01/06/2025", "02/05/2026"), assignments.stream().map(AssignmentExportDto::getAssignmentDate).toList());
		assertEquals("", assignments.get(1).getReturnDate(), "Attribution en cours : pas de date de parcours");
	}

	@Test
	void aProlongationIsNotACompletedVisit() {
		// Prolongée le 15/01 (nouvelle attribution le même jour), puis rendue le 10/03
		Territory territory = territory("T1",
				assignment(jean, LocalDate.of(2025, 9, 15), LocalDate.of(2026, 1, 15), ReturnSource.PROLONGATION),
				assignment(jean, LocalDate.of(2026, 1, 15), LocalDate.of(2026, 2, 1), ReturnSource.PROLONGATION),
				assignment(jean, LocalDate.of(2026, 2, 1), LocalDate.of(2026, 3, 10), ReturnSource.LIEN),
				assignment(marie, LocalDate.of(2026, 4, 1), null, null));

		List<AssignmentExportDto> assignments = ExportMappers.toExportDto(territory, START, END).getAssignments();

		assertEquals(2, assignments.size());
		assertEquals("Jean Dupont", assignments.getFirst().getAssignedToName());
		assertEquals("15/09/2025", assignments.getFirst().getAssignmentDate());
		assertEquals("10/03/2026", assignments.getFirst().getReturnDate());
		assertEquals("Marie Martin", assignments.get(1).getAssignedToName());
	}

	@Test
	void aRunningProlongedAssignmentHasNoCompletionDate() {
		Territory territory = territory("T1",
				assignment(jean, LocalDate.of(2025, 5, 2), LocalDate.of(2025, 9, 20), ReturnSource.PROLONGATION),
				assignment(jean, LocalDate.of(2025, 9, 20), null, null));

		List<AssignmentExportDto> assignments = ExportMappers.toExportDto(territory, START, END).getAssignments();

		assertEquals(1, assignments.size());
		assertEquals("02/05/2025", assignments.getFirst().getAssignmentDate(), "Date de la première attribution");
		assertEquals("", assignments.getFirst().getReturnDate());
	}

	@Test
	void campaignAssignmentsShowTheCampaignName() {
		Assignment campaignAssignment = Assignment.builder()
				.id(UUID.randomUUID())
				.campaign(Campaign.builder().name("Mémorial").build())
				.assignmentDate(LocalDate.of(2026, 3, 1))
				.returnDate(LocalDate.of(2026, 3, 31))
				.build();
		Assignment anonymous = Assignment.builder().id(UUID.randomUUID()).assignmentDate(LocalDate.of(2026, 4, 1)).build();
		Territory territory = territory("T1", campaignAssignment, anonymous);

		List<AssignmentExportDto> assignments = ExportMappers.toExportDto(territory, START, END).getAssignments();

		assertEquals("-- Mémorial --", assignments.getFirst().getAssignedToName());
		assertEquals("", assignments.get(1).getAssignedToName());
	}

	@Test
	void lastVisitIsTheLastRealReturnWrittenLikeTheOtherDates() {
		Territory territory = territory("T1",
				assignment(jean, LocalDate.of(2024, 9, 1), LocalDate.of(2024, 12, 5), ReturnSource.RESPONSABLE),
				assignment(marie, LocalDate.of(2025, 9, 1), LocalDate.of(2026, 1, 3), ReturnSource.PROLONGATION),
				assignment(marie, LocalDate.of(2026, 1, 3), null, null));

		assertEquals("05/12/2024", ExportMappers.toExportDto(territory, START, END).getLastReturnedOn());
		assertEquals("nouveau", ExportMappers.toExportDto(territory("T2"), START, END).getLastReturnedOn());
	}

	@Test
	void citiesAndTerritoriesAreSortedByName() {
		City rennes = City.builder().name("Rennes").territories(new ArrayList<>(List.of(territory("R2"), territory("R1")))).build();
		City cesson = City.builder().name("Cesson").territories(new ArrayList<>()).build();

		List<CityExportDto> cities = ExportMappers.toExportDtos(Arrays.asList(rennes, null, cesson), START, END);

		assertEquals(List.of("Cesson", "Rennes"), cities.stream().map(CityExportDto::getName).toList());
		assertEquals(List.of("R1", "R2"), cities.get(1).getTerritories().stream().map(TerritoryExportDto::getName).toList());
	}

	@Test
	void missingDataGivesEmptyResults() {
		assertTrue(ExportMappers.toExportDtos(null, START, END).isEmpty());
		assertNull(ExportMappers.toExportDto((City) null, START, END));
		assertNull(ExportMappers.toExportDto((Territory) null, START, END));
		assertTrue(ExportMappers.toExportDto(City.builder().name("Vide").territories(null).build(), START, END)
				.getTerritories().isEmpty());
		assertTrue(ExportMappers.registerEntries(null).isEmpty());

		Territory withoutDate = territory("T1", Assignment.builder().id(UUID.randomUUID()).person(jean).build());
		assertTrue(ExportMappers.toExportDto(withoutDate, START, END).getAssignments().isEmpty(),
				"Attribution sans date : ignorée");
	}

	private static Person person(String firstName, String lastName) {
		return Person.builder().id(UUID.randomUUID()).firstName(firstName).lastName(lastName).build();
	}

	private static Assignment assignment(Person person, LocalDate assignmentDate, LocalDate returnDate, ReturnSource returnedVia) {
		return Assignment.builder()
				.id(UUID.randomUUID())
				.person(person)
				.assignmentDate(assignmentDate)
				.returnDate(returnDate)
				.returnedVia(returnedVia)
				.build();
	}

	private static Territory territory(String name, Assignment... assignments) {
		return Territory.builder()
				.id(UUID.randomUUID())
				.name(name)
				.assignments(new ArrayList<>(List.of(assignments)))
				.build();
	}
}
