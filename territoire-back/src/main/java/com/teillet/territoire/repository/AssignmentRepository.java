package com.teillet.territoire.repository;

import com.teillet.territoire.model.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
	List<Assignment> findByDueDateBeforeAndReturnDateIsNull(LocalDate date);

	Optional<Assignment> findByReturnDateNullAndTerritory_Id(UUID id);

	boolean existsByTerritory_IdAndPerson_IdAndAssignmentDate(UUID territoryId, UUID personId, LocalDate assignmentDate);

	void deleteByTerritory_Id(UUID territoryId);

	List<Assignment> findAssignmentsByAssignmentDateAfterOrReturnDateAfter(LocalDate assignmentDateAfter, LocalDate returnDateAfter);

	void deleteAssignmentByTerritory_City_Name(String cityName);

	void deleteAll();

	/** Dates (attribution, retour) des attributions terminées : suffisant pour calculer des durées sans charger les entités. */
	@Query("SELECT a.assignmentDate, a.returnDate FROM Assignment a WHERE a.returnDate IS NOT NULL AND a.assignmentDate >= :startDate AND a.assignmentDate <= :endDate")
	List<Object[]> findReturnedAssignmentDatesBetweenQuery(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

	default List<Object[]> findReturnedAssignmentDatesBetween(LocalDate startDate, LocalDate endDate) {
		return findReturnedAssignmentDatesBetweenQuery(OptionalDates.startOrMin(startDate), OptionalDates.endOrMax(endDate));
	}

	List<Assignment> findByPerson_Id(UUID personId);

	List<Assignment> findByPerson_IdAndReturnDateIsNull(UUID personId);

	/** (personId, nombre d'attributions en cours) pour chaque personne ayant au moins un territoire. */
	@Query("SELECT a.person.id, COUNT(a) FROM Assignment a WHERE a.returnDate IS NULL AND a.person IS NOT NULL GROUP BY a.person.id")
	List<Object[]> countRunningAssignmentsByPerson();

	@Query("SELECT MIN(a.assignmentDate) FROM Assignment a")
	LocalDate findMinAssignmentDate();

	@Query(value = """
		SELECT a
		FROM Assignment a
		WHERE
			a.assignmentDate <= :endDate
			AND (a.returnDate >= :startDate OR a.returnDate IS NULL)
		ORDER BY a.assignmentDate DESC
	""")
	List<Assignment> findAssignmentsInPeriodQuery(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

	default List<Assignment> findAssignmentsInPeriod(LocalDate startDate, LocalDate endDate) {
		return findAssignmentsInPeriodQuery(OptionalDates.startOrMin(startDate), OptionalDates.endOrMax(endDate));
	}

	/**
	 * Calculates the overall average duration of assignments in days.
	 * Only considers completed assignments (where returnDate is not null).
	 *
	 * @return The average duration in days
	 */
	@Query(value = """
			    SELECT AVG(EXTRACT(EPOCH FROM (a.return_date::timestamp - a.assignment_date::timestamp))::numeric/86400)
			    FROM Assignment a
			    WHERE a.return_date IS NOT NULL
			""", nativeQuery = true)
	Double calculateOverallAverageAssignmentDuration();

	@Query(value = """
			    SELECT AVG(EXTRACT(EPOCH FROM (a.return_date::timestamp - a.assignment_date::timestamp))::numeric/86400)
			    FROM Assignment a
			    WHERE a.return_date IS NOT NULL
			      AND (:hasStart = false OR a.assignment_date >= :startDate)
			      AND (:hasEnd = false OR a.assignment_date <= :endDate)
			""", nativeQuery = true)
	Double calculateOverallAverageAssignmentDurationBetweenQuery(@Param("hasStart") boolean hasStart, @Param("startDate") LocalDate startDate,
	                                                             @Param("hasEnd") boolean hasEnd, @Param("endDate") LocalDate endDate);

	default Double calculateOverallAverageAssignmentDurationBetween(LocalDate startDate, LocalDate endDate) {
		return calculateOverallAverageAssignmentDurationBetweenQuery(startDate != null, OptionalDates.startOrMin(startDate), endDate != null, OptionalDates.endOrMax(endDate));
	}

}
