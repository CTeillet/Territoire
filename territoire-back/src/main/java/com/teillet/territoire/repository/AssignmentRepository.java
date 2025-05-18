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

	List<Assignment> findByReturnDateNotNull();


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

}
