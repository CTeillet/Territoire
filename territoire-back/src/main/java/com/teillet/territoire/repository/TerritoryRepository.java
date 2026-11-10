package com.teillet.territoire.repository;

import com.teillet.territoire.dto.ArchivedTerritoryDto;
import com.teillet.territoire.dto.AvailableTerritoryDto;
import com.teillet.territoire.dto.LateTerritoryDto;
import com.teillet.territoire.repository.projection.Bbox3857;
import com.teillet.territoire.repository.projection.TerritoryCardRow;
import com.teillet.territoire.repository.projection.TerritoryHullRow;
import com.teillet.territoire.repository.projection.TerritoryStatisticsProjection;
import com.teillet.territoire.model.Territory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TerritoryRepository extends JpaRepository<Territory, UUID> {

    /** Territoires de la ville, archivés compris : ils empêchent aussi de la supprimer (clé étrangère). */
    @Query(nativeQuery = true, value = "SELECT EXISTS (SELECT 1 FROM territory WHERE city_id = :cityId)")
    boolean existsByCity_Id(@Param("cityId") UUID cityId);

    /** Territoires archivés (que la restriction de l'entité cache partout ailleurs), le plus récent d'abord. */
    @Query(nativeQuery = true, value = """
            SELECT t.id, t.name, c.name, t.archived_at,
                (SELECT COUNT(*) FROM assignment a WHERE a.territory_id = t.id)
            FROM territory t
            JOIN city c ON c.id = t.city_id
            WHERE t.archived_at IS NOT NULL
            ORDER BY t.archived_at DESC
            """)
    List<Object[]> findArchivedRows();

    /** Territoires archivés : identifiant, nom, ville, date d'archivage et nombre d'attributions. */
    default List<ArchivedTerritoryDto> findArchived() {
        return findArchivedRows().stream()
                .map(row -> new ArchivedTerritoryDto(
                        toUuid(row[0]),
                        (String) row[1],
                        (String) row[2],
                        toInstant(row[3]),
                        ((Number) row[4]).longValue()))
                .toList();
    }

    /** Identifiant lu par une requête native : UUID en PostgreSQL, 16 octets en H2 (tests). */
    private static UUID toUuid(Object value) {
        if (value instanceof UUID uuid) {
            return uuid;
        }
        if (value instanceof byte[] bytes && bytes.length == 16) {
            java.nio.ByteBuffer buffer = java.nio.ByteBuffer.wrap(bytes);
            return new UUID(buffer.getLong(), buffer.getLong());
        }
        return UUID.fromString(value.toString());
    }

    /** Date lue par une requête native : selon le pilote, Timestamp, OffsetDateTime ou Instant. */
    private static java.time.Instant toInstant(Object value) {
        return switch (value) {
            case null -> null;
            case java.time.Instant instant -> instant;
            case java.time.OffsetDateTime offset -> offset.toInstant();
            case java.time.ZonedDateTime zoned -> zoned.toInstant();
            case java.sql.Timestamp timestamp -> timestamp.toInstant();
            default -> throw new IllegalStateException("Date inattendue : " + value.getClass());
        };
    }

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(nativeQuery = true, value = "UPDATE territory SET archived_at = NULL WHERE id = :id AND archived_at IS NOT NULL")
    int restoreArchived(@Param("id") UUID id);

    /** Données légères (id, type, nom de ville) pour les statistiques : évite de charger les entités complètes (cartes, pâtés...). */
    /** Territoires en service (non archivés). */
    List<Territory> findByArchivedAtIsNull();

    @Query("SELECT t.id, t.type, t.city.name FROM Territory t WHERE t.archivedAt IS NULL")
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
                WHERE t.archivedAt IS NULL
                GROUP BY t.status
            """)
    List<TerritoryStatisticsProjection> getCurrentTerritoryStats();

    Territory findByName(String name);

    List<Territory> findByStatusAndArchivedAtIsNull(com.teillet.territoire.enums.TerritoryStatus status);

    /** Nombre de territoires par statut : lignes (statut, nombre), un statut sans territoire est absent. */
    @Query("SELECT t.status, COUNT(t) FROM Territory t WHERE t.archivedAt IS NULL GROUP BY t.status")
    List<Object[]> countGroupedByStatus();

    /** Territoires disponibles (données légères, sans cartes ni pâtés) avec la date de leur dernier retour. */
    @Query("""
            SELECT new com.teillet.territoire.dto.AvailableTerritoryDto(t.id, t.name, t.type, c.name,
                (SELECT MAX(a.returnDate) FROM Assignment a WHERE a.territory = t))
            FROM Territory t LEFT JOIN t.city c
            WHERE t.status = com.teillet.territoire.enums.TerritoryStatus.AVAILABLE AND t.archivedAt IS NULL
            """)
    List<AvailableTerritoryDto> findAvailable();

    /** Comme {@link #findAvailable()}, limité à une ville. */
    @Query("""
            SELECT new com.teillet.territoire.dto.AvailableTerritoryDto(t.id, t.name, t.type, c.name,
                (SELECT MAX(a.returnDate) FROM Assignment a WHERE a.territory = t))
            FROM Territory t JOIN t.city c
            WHERE t.status = com.teillet.territoire.enums.TerritoryStatus.AVAILABLE AND c.id = :cityId AND t.archivedAt IS NULL
            """)
    List<AvailableTerritoryDto> findAvailableInCity(@Param("cityId") UUID cityId);

    /**
     * Territoires en retard (données légères) avec la personne qui les a, l'échéance et la dernière relance faite pendant
     * l'attribution en cours, c'est-à-dire après son premier jour (un rappel de ce jour-là concerne l'attribution
     * précédente, close par une prolongation par exemple). Les plus anciennes échéances d'abord.
     */
    @Query("""
            SELECT new com.teillet.territoire.dto.LateTerritoryDto(t.id, t.name, c.name, p.firstName, p.lastName, a.dueDate,
                (SELECT MAX(r.reminderDate) FROM TerritoryReminder r JOIN r.territories rt
                 WHERE rt = t AND r.person = p AND r.reminderDate > a.assignmentDate))
            FROM Territory t JOIN t.city c
            LEFT JOIN t.assignments a ON a.returnDate IS NULL
            LEFT JOIN a.person p
            WHERE t.status = com.teillet.territoire.enums.TerritoryStatus.LATE
            ORDER BY a.dueDate, t.name
            """)
    List<LateTerritoryDto> findLate();

    /** (id, nom) des territoires demandés, sans charger les entités. */
    @Query("SELECT t.id, t.name FROM Territory t WHERE t.id IN :ids")
    List<Object[]> findNamesByIds(@Param("ids") Collection<UUID> ids);

    @Query(value = """
                SELECT COUNT(t)
                FROM Territory t
                WHERE t.archivedAt IS NULL AND t.id NOT IN (
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
                WHERE t.archivedAt IS NULL AND t.id NOT IN (
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
            		(COUNT(t.id) * 100.0 / (SELECT COUNT(*) FROM territory WHERE archived_at IS NULL)) as percentage
            	FROM territory t
            	JOIN city c ON t.city_id = c.id
            	WHERE t.archived_at IS NULL AND (:hasStart = false OR t.id IN (
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
            WHERE t.concave_hull IS NOT NULL AND t.archived_at IS NULL
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
            WHERE t.concave_hull IS NOT NULL AND t.archived_at IS NULL
              AND t.city_id = :cityId
            """, nativeQuery = true)
    List<TerritoryHullRow> findAllProjected3857ByCityId(UUID cityId);

    /**
     * Nom, ville, pâtés (EPSG:3857) et nombre d'adresses à ne pas visiter d'un territoire, pour sa carte physique. Les
     * pâtés restent séparés : leur contour commun (concave_hull) recouvrirait les rues qui les séparent.
     */
    @Query(value = """
            SELECT
                t.name AS name,
                c.name AS cityName,
                (SELECT ST_AsBinary(ST_Transform(ST_Collect(b.block), 3857))
                 FROM block b WHERE b.territory_id = t.id) AS blocksWkb,
                (SELECT COUNT(*) FROM address_not_to_do a WHERE a.territory_id = t.id) AS addressesNotToDo
            FROM territory t
            JOIN city c ON c.id = t.city_id
            WHERE t.id = :id
            """, nativeQuery = true)
    Optional<TerritoryCardRow> findCardRow(@Param("id") UUID id);

    @Query(value = """
            SELECT
                ST_XMin(ext)::float8 AS minx,
                ST_YMin(ext)::float8 AS miny,
                ST_XMax(ext)::float8 AS maxx,
                ST_YMax(ext)::float8 AS maxy
            FROM (
                SELECT ST_Extent(ST_Transform(concave_hull, 3857)) AS ext
                FROM territory
                WHERE concave_hull IS NOT NULL AND archived_at IS NULL
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
            WHERE concave_hull IS NOT NULL AND archived_at IS NULL
                    AND city_id = :cityId
                ) s
            """, nativeQuery = true)
    Bbox3857 findBbox3857ByCityId(UUID cityId);
}
