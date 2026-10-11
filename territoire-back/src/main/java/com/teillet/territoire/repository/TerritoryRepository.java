package com.teillet.territoire.repository;

import com.teillet.territoire.repository.projection.Bbox3857;
import com.teillet.territoire.repository.projection.TerritoryHullRow;
import com.teillet.territoire.repository.projection.TerritoryStatisticsProjection;
import com.teillet.territoire.model.Territory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface TerritoryRepository extends JpaRepository<Territory, UUID> {

    boolean existsByCity_Id(UUID cityId);

    /** Données légères (id, type, nom de ville) pour les statistiques : évite de charger les entités complètes (cartes, pâtés...). */
    @Query("SELECT t.id, t.type, t.city.name FROM Territory t")
    List<Object[]> findAllIdTypeAndCityName();

    // clearAutomatically : l'entité déjà chargée serait sinon périmée et réécraserait le contour au flush suivant
    @Modifying(flushAutomatically = true, clearAutomatically = true)
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

    Territory findByName(String name);

    List<Territory> findByStatus(com.teillet.territoire.enums.TerritoryStatus status);

    List<Territory> findByCity_Name(String cityName);

    @Query(value = """
                SELECT COUNT(t)
                FROM Territory t
                WHERE t.id NOT IN (
                    SELECT DISTINCT a.territory.id
                    FROM Assignment a
                    WHERE
                        (:hasEnd = false AND (
                            a.assignmentDate >= :startDate
                            OR
                            (a.assignmentDate < :startDate AND (a.returnDate >= :startDate OR a.returnDate IS NULL))
                        ))
                        OR
                        (:hasEnd = true AND (
                            a.assignmentDate <= :endDate
                            AND (a.returnDate >= :startDate OR a.returnDate IS NULL)
                        ))
                )
            """)
    long countTerritoriesNotAssignedBetweenQuery(@Param("startDate") LocalDate startDate, @Param("hasEnd") boolean hasEnd, @Param("endDate") LocalDate endDate);

    default long countTerritoriesNotAssignedBetween(LocalDate startDate, LocalDate endDate) {
        return countTerritoriesNotAssignedBetweenQuery(OptionalDates.startOrMin(startDate), endDate != null, OptionalDates.endOrMax(endDate));
    }

    @Query(value = """
                SELECT t.id
                FROM Territory t
                WHERE t.id NOT IN (
                    SELECT DISTINCT a.territory.id
                    FROM Assignment a
                    WHERE
                        (:hasEnd = false AND (
                            a.assignmentDate >= :startDate
                            OR
                            (a.assignmentDate < :startDate AND (a.returnDate >= :startDate OR a.returnDate IS NULL))
                        ))
                        OR
                        (:hasEnd = true AND (
                            a.assignmentDate <= :endDate
                            AND (a.returnDate >= :startDate OR a.returnDate IS NULL)
                        ))
                )
            """)
    List<UUID> findTerritoryIdsNotAssignedBetweenQuery(@Param("startDate") LocalDate startDate, @Param("hasEnd") boolean hasEnd, @Param("endDate") LocalDate endDate);

    default List<UUID> findTerritoryIdsNotAssignedBetween(LocalDate startDate, LocalDate endDate) {
        return findTerritoryIdsNotAssignedBetweenQuery(OptionalDates.startOrMin(startDate), endDate != null, OptionalDates.endOrMax(endDate));
    }

    /**
     * Calculates the distribution of territories by city.
     * Returns the city name, count of territories, and percentage of total.
     *
     * @param startDate Optional date to filter territories assigned since a specific date
     * @param endDate Optional date to filter territories assigned before a specific date
     * @return List of objects containing city name, territory count, and percentage
     */
    @Query(nativeQuery = true, value = """
            	SELECT
            		c.name as cityName,
            		COUNT(t.id) as territoryCount,
            		(COUNT(t.id) * 100.0 / (SELECT COUNT(*) FROM territory)) as percentage
            	FROM territory t
            	JOIN city c ON t.city_id = c.id
            	WHERE (:hasStart = false OR t.id IN (
            		SELECT DISTINCT a.territory_id
            		FROM assignment a
            		WHERE
            			(:hasEnd = false AND (
            				a.assignment_date >= :startDate
            				OR
            				(a.assignment_date < :startDate AND (a.return_date >= :startDate OR a.return_date IS NULL))
            			))
            			OR
            			(:hasEnd = true AND (
            				a.assignment_date <= :endDate
            				AND (a.return_date >= :startDate OR a.return_date IS NULL)
            			))
            	))
            	GROUP BY c.name
            	ORDER BY COUNT(t.id) DESC
            """)
    List<Object[]> calculateTerritoryDistributionByCityQuery(@Param("hasStart") boolean hasStart, @Param("startDate") LocalDate startDate,
                                                             @Param("hasEnd") boolean hasEnd, @Param("endDate") LocalDate endDate);

    default List<Object[]> calculateTerritoryDistributionByCity(LocalDate startDate, LocalDate endDate) {
        return calculateTerritoryDistributionByCityQuery(startDate != null, OptionalDates.startOrMin(startDate), endDate != null, OptionalDates.endOrMax(endDate));
    }

    @Query(value = """
            SELECT
                t.name AS name,
                ST_AsBinary(ST_Transform(t.concave_hull, 3857))                    AS hullWkb,
                ST_AsBinary(ST_PointOnSurface(ST_Transform(t.concave_hull, 3857))) AS labelWkb,
                c.color_hex AS cityColorHex
            FROM territory t
            JOIN city c ON c.id = t.city_id
            WHERE t.concave_hull IS NOT NULL
            """, nativeQuery = true)
    List<TerritoryHullRow> findAllProjected3857();

    @Query(value = """
            SELECT
                t.name AS name,
                ST_AsBinary(ST_Transform(t.concave_hull, 3857))                    AS hullWkb,
                ST_AsBinary(ST_PointOnSurface(ST_Transform(t.concave_hull, 3857))) AS labelWkb,
                c.color_hex AS cityColorHex
            FROM territory t
            JOIN city c ON c.id = t.city_id
            WHERE t.concave_hull IS NOT NULL
              AND t.city_id = :cityId
            """, nativeQuery = true)
    List<TerritoryHullRow> findAllProjected3857ByCityId(UUID cityId);

    @Query(value = """
            SELECT
                ST_XMin(ext)::float8 AS minx,
                ST_YMin(ext)::float8 AS miny,
                ST_XMax(ext)::float8 AS maxx,
                ST_YMax(ext)::float8 AS maxy
            FROM (
                SELECT ST_Extent(ST_Transform(concave_hull, 3857)) AS ext
                FROM territory
                WHERE concave_hull IS NOT NULL
            ) s
            """, nativeQuery = true)
    Bbox3857 findBbox3857();

    @Query(value = """
                SELECT ST_XMin(ext)::float8 AS minx,
                       ST_YMin(ext)::float8 AS miny,
                       ST_XMax(ext)::float8 AS maxx,
                       ST_YMax(ext)::float8 AS maxy
                FROM (
                  SELECT ST_Extent(ST_Transform(concave_hull, 3857)) AS ext
            FROM territory
            WHERE concave_hull IS NOT NULL
                    AND city_id = :cityId
                ) s
            """, nativeQuery = true)
    Bbox3857 findBbox3857ByCityId(UUID cityId);
}
