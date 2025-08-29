package com.teillet.territoire.record;

import org.locationtech.jts.geom.Envelope;

import java.awt.image.BufferedImage;

public record TileImage(BufferedImage img, Envelope env3857, int pixelWidth, int pixelHeight) {}
