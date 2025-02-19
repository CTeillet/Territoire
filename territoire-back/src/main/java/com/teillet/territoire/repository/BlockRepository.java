package com.teillet.territoire.repository;

import com.teillet.territoire.model.Block;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BlockRepository extends JpaRepository<Block, UUID> {
	long deleteByIdAndTerritory_Id(UUID blockId, UUID territoryId);
}
