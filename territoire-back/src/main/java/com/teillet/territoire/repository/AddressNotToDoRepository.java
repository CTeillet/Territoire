package com.teillet.territoire.repository;

import com.teillet.territoire.model.AddressNotToDo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AddressNotToDoRepository  extends JpaRepository<AddressNotToDo, UUID> {
	Optional<AddressNotToDo> findByIdAndTerritory_Id(UUID id, UUID id1);
}
