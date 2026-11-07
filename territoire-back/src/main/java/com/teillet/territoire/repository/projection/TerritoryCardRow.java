package com.teillet.territoire.repository.projection;

/** Ce que montre la carte physique d'un territoire. */
public interface TerritoryCardRow {
    String getName();
    String getCityName();
    /** Contour du territoire en EPSG:3857 (ST_AsBinary) ; null tant qu'aucun pâté n'est dessiné. */
    byte[] getHullWkb();
    /** Nombre d'adresses à ne pas visiter. */
    Long getAddressesNotToDo();
}
