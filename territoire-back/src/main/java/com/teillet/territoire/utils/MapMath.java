package com.teillet.territoire.utils;


import org.locationtech.jts.geom.Envelope;

public final class MapMath {

    private MapMath() {}

    // IGN WMTS PM constants
    public static final double ORIGIN_SHIFT = 20037508.342789244; // meters
    public static final int TILE_SIZE = 256;

    /** meters/pixel at zoom z */
    public static double resolution(int z) {
        return (2 * ORIGIN_SHIFT) / (TILE_SIZE * (1 << z));
    }

    /** EPSG:4326 lon -> tile X */
    public static int lon2tileX(double lonDeg, int z) {
        double mx = Math.toRadians(lonDeg) * 6378137.0;
        double res = resolution(z);
        return (int) Math.floor((mx + ORIGIN_SHIFT) / (TILE_SIZE * res));
    }

    /** EPSG:4326 lat -> tile Y */
    public static int lat2tileY(double latDeg, int z) {
        double phi = Math.toRadians(Math.max(-85.05112878, Math.min(85.05112878, latDeg)));
        double my = Math.log(Math.tan(Math.PI/4 + phi/2)) * 6378137.0;
        double res = resolution(z);
        return (int) Math.floor((ORIGIN_SHIFT - my) / (TILE_SIZE * res));
    }

    /** Bounds of a tile (meters, EPSG:3857) */
    public static Envelope tileBoundsMeters(int x, int y, int z) {
        double res = resolution(z);
        double minx = -ORIGIN_SHIFT + x * TILE_SIZE * res;
        double maxx = -ORIGIN_SHIFT + (x + 1) * TILE_SIZE * res;
        double maxy =  ORIGIN_SHIFT - y * TILE_SIZE * res;
        double miny =  ORIGIN_SHIFT - (y + 1) * TILE_SIZE * res;
        return new Envelope(minx, maxx, miny, maxy);
    }
}