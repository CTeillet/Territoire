package com.teillet.territoire.service;

import java.util.UUID;

public interface ITerritoryMapService {
    byte[] generatePng(String paper, String orientation, int dpi, UUID cityId, int zoom) throws Exception;
}
