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

	void deleteByTerritory_Id(UUID territoryId);

	List<Assignment> findAssignmentsByAssignmentDateAfterOrReturnDateAfter(LocalDate assignmentDateAfter, LocalDate returnDateAfter);

	void deleteAssignmentByTerritory_City_Name(String cityName);

	void deleteAll();

	List<Assignment> findByReturnDateNotNull();

	List<Assignment> findByPerson_Id(UUID personId);

	@Query("SELECT MIN(a.assignmentDate) FROM Assignment a")
	LocalDate findMinAssignmentDate();

	@Query(value = """
		SELECT a
		FROM Assignment a
		WHERE
			(:hasStart = false OR a.assignmentDate <= :endDate)
			AND (:hasEnd = false OR (a.returnDate >= :startDate OR a.returnDate IS NULL))
		ORDER BY a.assignmentDate DESC
	""")
	List<Assignment> findAssignmentsInPeriodQuery(@Param("hasStart") boolean hasStart, @Param("startDate") LocalDate startDate,
	                                              @Param("hasEnd") boolean hasEnd, @Param("endDate") LocalDate endDate);

	default List<Assignment> findAssignmentsInPeriod(LocalDate startDate, LocalDate endDate) {
		return findAssignmentsInPeriodQuery(startDate != null, OptionalDates.startOrMin(startDate), endDate != null, OptionalDates.endOrMax(endDate));
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
