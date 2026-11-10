package com.teillet.territoire.mapper;

import com.teillet.territoire.dto.exportExcel.AssignmentExportDto;
import com.teillet.territoire.dto.exportExcel.CityExportDto;
import com.teillet.territoire.dto.exportExcel.TerritoryExportDto;
import com.teillet.territoire.enums.ReturnSource;
import com.teillet.territoire.model.Assignment;
import com.teillet.territoire.model.City;
import com.teillet.territoire.model.Person;
import com.teillet.territoire.model.Territory;
import com.teillet.territoire.utils.TerritoryUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * Données de l'export Excel, le registre des attributions de territoire (S-13) d'une année : par ville, chaque
 * territoire avec ses attributions de l'année dans l'ordre chronologique.
 */
public class ExportMappers {
	public static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

	private ExportMappers() {}

	/**
	 * Ligne du registre : une attribution, prolongations comprises. Une prolongation n'est pas un retour (la personne
	 * garde le territoire) : l'attribution prolongée et celle qui la suit forment une seule ligne, de la première date
	 * d'attribution au retour final.
	 */
	record RegisterEntry(Assignment first, LocalDate returnDate) {
		LocalDate assignmentDate() {
			return first.getAssignmentDate();
		}

		/** L'attribution chevauche [start, end] ; en cours, elle compte dès qu'elle a commencé avant la fin. */
		boolean overlaps(LocalDate start, LocalDate end) {
			if (assignmentDate().isAfter(end)) {
				return false;
			}
			return returnDate == null || !returnDate.isBefore(start);
		}
	}

	/** Mappe une liste de villes vers des DTO d’export (triées par nom). */
	public static List<CityExportDto> toExportDtos(List<City> cities, LocalDate start, LocalDate end) {
		return cities == null ? List.of() : cities.stream()
				.filter(Objects::nonNull)
				.map(c -> toExportDto(c, start, end))
				.sorted(Comparator.comparing(CityExportDto::getName))
				.toList();
	}

	/** Mappe une ville : ses territoires triés par nom, avec leurs attributions de l'année. */
	public static CityExportDto toExportDto(City city, LocalDate start, LocalDate end) {
		if (city == null) return null;

		List<TerritoryExportDto> territories = city.getTerritories() == null ? List.of() :
				city.getTerritories().stream()
						.filter(Objects::nonNull)
						.map(t -> toExportDto(t, start, end))
						.sorted(Comparator.comparing(TerritoryExportDto::getName))
						.toList();

		CityExportDto dto = new CityExportDto();
		dto.setName(city.getName());
		dto.setTerritories(territories);
		return dto;
	}

	/**
	 * Mappe un territoire : ses attributions qui chevauchent l'année, dans l'ordre chronologique, et la date du dernier
	 * retour (toutes années confondues).
	 */
	public static TerritoryExportDto toExportDto(Territory t, LocalDate start, LocalDate end) {
		if (t == null) return null;

		List<AssignmentExportDto> assignments = registerEntries(t.getAssignments()).stream()
				.filter(entry -> entry.overlaps(start, end))
				.map(ExportMappers::toExportDto)
				.toList();

		TerritoryExportDto dto = new TerritoryExportDto();
		dto.setName(t.getName());
		dto.setAssignments(assignments);
		dto.setLastReturnedOn(TerritoryUtils.getLastVisitDate(t)
				.map(ExportMappers::formatDate)
				.orElse(TerritoryUtils.NOUVEAU));
		return dto;
	}

	/** Lignes du registre, dans l'ordre chronologique, les prolongations fusionnées avec l'attribution qu'elles prolongent. */
	static List<RegisterEntry> registerEntries(List<Assignment> assignments) {
		if (assignments == null) return List.of();
		List<Assignment> sorted = assignments.stream()
				.filter(Objects::nonNull)
				.filter(a -> a.getAssignmentDate() != null)
				.sorted(Comparator.comparing(Assignment::getAssignmentDate))
				.toList();

		List<RegisterEntry> entries = new ArrayList<>();
		Assignment first = null;
		Assignment last = null;
		for (Assignment assignment : sorted) {
			if (last != null && isProlongedBy(last, assignment)) {
				last = assignment;
				continue;
			}
			if (first != null) {
				entries.add(new RegisterEntry(first, last.getReturnDate()));
			}
			first = assignment;
			last = assignment;
		}
		if (first != null) {
			entries.add(new RegisterEntry(first, last.getReturnDate()));
		}
		return entries;
	}

	/** {@code next} prolonge {@code previous} : même personne, et {@code previous} s'est terminée par une prolongation. */
	private static boolean isProlongedBy(Assignment previous, Assignment next) {
		return previous.getReturnedVia() == ReturnSource.PROLONGATION && samePerson(previous.getPerson(), next.getPerson());
	}

	private static boolean samePerson(Person a, Person b) {
		if (a == null || b == null) return false;
		return a == b || (a.getId() != null && a.getId().equals(b.getId()));
	}

	private static AssignmentExportDto toExportDto(RegisterEntry entry) {
		AssignmentExportDto dto = new AssignmentExportDto();
		dto.setAssignmentDate(formatDate(entry.assignmentDate()));
		dto.setReturnDate(formatDate(entry.returnDate()));
		dto.setAssignedToName(getPersonName(entry.first()));
		return dto;
	}

	private static String formatDate(LocalDate date) {
		return date != null ? date.format(DATE_FORMATTER) : "";
	}

	private static String getPersonName(Assignment assignment) {
		if (assignment.getPerson() != null) {
			return assignment.getPerson().getFirstName() + " " + assignment.getPerson().getLastName();
		} else if (assignment.getCampaign() != null) {
			return "-- " + assignment.getCampaign().getName() + " --";
		}
		return "";
	}
}
