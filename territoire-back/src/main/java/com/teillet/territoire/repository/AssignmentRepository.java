package com.teillet.territoire.repository;

import com.teillet.territoire.model.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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

	/**
	 * Calculates the average duration of assignments in days, grouped by month.
	 * Only considers completed assignments (where returnDate is not null).
	 * 
	 * @return List of objects containing the year-month and average duration
	 */
	@Query(value = """
		SELECT
			FUNCTION('DATE_FORMAT', a.assignmentDate, '%Y-%m-01') as yearMonth,
			AVG(FUNCTION('TIMESTAMPDIFF', 'DAY', a.assignmentDate, a.returnDate)) as averageDuration
		FROM Assignment a
		WHERE a.returnDate IS NOT NULL
		GROUP BY FUNCTION('DATE_FORMAT', a.assignmentDate, '%Y-%m-01')
		ORDER BY FUNCTION('DATE_FORMAT', a.assignmentDate, '%Y-%m-01')
	""")
	List<Object[]> calculateAverageAssignmentDurationByMonth();

	/**
	 * Calculates the overall average duration of assignments in days.
	 * Only considers completed assignments (where returnDate is not null).
	 * 
	 * @return The average duration in days
	 */
	@Query(value = """
		SELECT AVG(FUNCTION('TIMESTAMPDIFF', 'DAY', a.assignmentDate, a.returnDate))
		FROM Assignment a
		WHERE a.returnDate IS NOT NULL
	""")
	Double calculateOverallAverageAssignmentDuration();
}
