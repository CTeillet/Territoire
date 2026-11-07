package com.teillet.territoire.record;

import org.locationtech.jts.geom.Envelope;

import java.awt.image.BufferedImage;

/**
 * Mosaïque de tuiles WMTS. {@code failedTiles} compte les tuiles que le serveur n'a pas servies, même après
 * plusieurs essais : elles sont remplies de gris.
 */
public record TileImage(BufferedImage img, Envelope env3857, int pixelWidth, int pixelHeight, int failedTiles) {

    public TileImage(BufferedImage img, Envelope env3857, int pixelWidth, int pixelHeight) {
        this(img, env3857, pixelWidth, pixelHeight, 0);
    }
}
