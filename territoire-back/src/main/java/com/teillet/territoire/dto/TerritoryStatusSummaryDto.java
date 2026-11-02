package com.teillet.territoire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Nombre de territoires par statut, pour les intégrations externes (tuile Homepage).
 * Volontairement sans aucune donnée personnelle : ni noms, ni adresses, ni territoires.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerritoryStatusSummaryDto {
    private long late;
    private long assigned;
    private long available;
    private long pending;
    private long total;
}
