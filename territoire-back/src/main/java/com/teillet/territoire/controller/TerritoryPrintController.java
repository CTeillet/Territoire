package com.teillet.territoire.controller;

import com.teillet.territoire.service.impl.TerritoryMapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/exports")
public class TerritoryPrintController {
    private final TerritoryMapService mapService;

    @GetMapping(value = "/territories.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> exportPng(
            @RequestParam(defaultValue = "A3") String paper,
            @RequestParam(defaultValue = "landscape") String orientation,
            @RequestParam(defaultValue = "300") int dpi,
            @RequestParam(required = false) UUID cityId,
            @RequestParam(defaultValue = "14") int zoom
    ) throws Exception {
        byte[] png = mapService.generatePng(paper, orientation, dpi, cityId, zoom);
        return ResponseEntity.ok(png);
    }
}
