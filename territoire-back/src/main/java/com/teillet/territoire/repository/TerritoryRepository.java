package com.teillet.territoire.repository;

import com.teillet.territoire.model.Territory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

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
	int updateConcaveHullTerritory(UUID id);
}
