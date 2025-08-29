package com.teillet.territoire.repository.projection;

public interface TerritoryHullRow {
    String getName();
    byte[] getHullWkb();   // ST_AsBinary(...)
    byte[] getLabelWkb();  // ST_AsBinary(...)
}