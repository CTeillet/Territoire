package com.teillet.territoire.repository;

import com.teillet.territoire.model.City;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CityRepository extends JpaRepository<City, UUID> {

	/** Villes ayant au moins un territoire, par ordre alphabétique. */
	@Query("SELECT c FROM City c WHERE EXISTS (SELECT t.id FROM Territory t WHERE t.city = c) ORDER BY c.name")
	List<City> findWithTerritories();
}
