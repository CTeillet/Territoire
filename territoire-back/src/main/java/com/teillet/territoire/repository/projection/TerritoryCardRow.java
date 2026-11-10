package com.teillet.territoire.repository.projection;

/** Ce que montre la carte physique d'un territoire. */
public interface TerritoryCardRow {
    String getName();
    String getCityName();
    /** Pâtés du territoire en EPSG:3857, réunis sans être fusionnés (ST_AsBinary) ; null tant qu'aucun n'est dessiné. */
    byte[] getBlocksWkb();
    /** Nombre d'adresses à ne pas visiter. */
    Long getAddressesNotToDo();
}
