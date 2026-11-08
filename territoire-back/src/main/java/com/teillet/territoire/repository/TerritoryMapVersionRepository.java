package com.teillet.territoire.repository;

import com.teillet.territoire.dto.TerritoryMapVersionDto;
import com.teillet.territoire.model.TerritoryMapVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TerritoryMapVersionRepository extends JpaRepository<TerritoryMapVersion, UUID> {

	/** Cartes précédentes d'un territoire, la plus récemment remplacée d'abord, sans leur image. */
	@Query("""
			select new com.teillet.territoire.dto.TerritoryMapVersionDto(v.id, v.fileName, v.contentType, v.replacedAt)
			from TerritoryMapVersion v
			where v.territory.id = :territoryId
			order by v.replacedAt desc""")
	List<TerritoryMapVersionDto> findSummaries(@Param("territoryId") UUID territoryId);

	Optional<TerritoryMapVersion> findByIdAndTerritory_Id(UUID id, UUID territoryId);

	@Modifying
	@Query("delete from TerritoryMapVersion v where v.territory.id = :territoryId")
	void deleteByTerritoryId(@Param("territoryId") UUID territoryId);
}
