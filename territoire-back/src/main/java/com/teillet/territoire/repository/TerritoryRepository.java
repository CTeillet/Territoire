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
			Update territory
			set concave_hull =
			        (Select ST_ConcaveHull(ST_Union(block), 0.5)
			         from territory
			                  left join block b on territory.id = b.territory_id
			         where territory_id=:id
			         group by territory_id)
			where territory.id = :id;
			""")
	void updateConcaveHullTerritory(UUID id);

	@Query(value = """
        SELECT t.status AS status, COUNT(*) AS total
        FROM Territory t
        GROUP BY t.status
    """)
	List<TerritoryStatisticsProjection> getCurrentTerritoryStats();
}
