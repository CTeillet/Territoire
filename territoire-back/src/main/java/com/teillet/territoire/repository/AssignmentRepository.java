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
			(CAST(:startDate AS DATE) IS NULL OR a.assignmentDate <= CAST(:endDate AS DATE))
			AND (CAST(:endDate AS DATE) IS NULL OR (a.returnDate >= CAST(:startDate AS DATE) OR a.returnDate IS NULL))
		ORDER BY a.assignmentDate DESC
	""")
	List<Assignment> findAssignmentsInPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

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
			      AND (CAST(:startDate AS DATE) IS NULL OR a.assignment_date >= CAST(:startDate AS DATE))
			      AND (CAST(:endDate AS DATE) IS NULL OR a.assignment_date <= CAST(:endDate AS DATE))
			""", nativeQuery = true)
	Double calculateOverallAverageAssignmentDurationBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

}
