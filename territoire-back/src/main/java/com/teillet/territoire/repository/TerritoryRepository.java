package com.teillet.territoire.repository;

import com.teillet.territoire.dto.TerritoryStatisticsProjection;
import com.teillet.territoire.model.Territory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TerritoryRepository extends JpaRepository<Territory, UUID> {

	@Modifying
	@Query(nativeQuery = true, value = """
			UPDATE territory
			SET concave_hull = (
				SELECT ST_Transform(
							   ST_Buffer(
									   ST_Union(
											   ST_Buffer(
													   ST_Transform(b.block, 2154), 7
											   )
									   ),
									   -8
							   ),
							   4326
					   )
				FROM block b
				WHERE b.territory_id = territory.id
			)
			WHERE territory.id = :id;
			""")
	void updateConcaveHullTerritory(UUID id);

	@Query(value = """
        SELECT t.status AS status, COUNT(*) AS total
        FROM Territory t
        GROUP BY t.status
    """)
	List<TerritoryStatisticsProjection> getCurrentTerritoryStats();
}
