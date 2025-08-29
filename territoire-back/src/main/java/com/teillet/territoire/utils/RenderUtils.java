package com.teillet.territoire.utils;

import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.Polygon;

import java.awt.*;
import java.awt.geom.Path2D;

public final class RenderUtils {
    private RenderUtils() {}

    /** Polygon/MultiPolygon -> Java2D Path in pixel space */
    public static Shape toShape(Geometry g, double scale, double ox, double oy) {
        Path2D.Double path = new Path2D.Double();
        for (int gi = 0; gi < g.getNumGeometries(); gi++) {
            Polygon p = (Polygon) g.getGeometryN(gi);
            appendRing(path, p.getExteriorRing(), scale, ox, oy);
            for (int i = 0; i < p.getNumInteriorRing(); i++) {
                appendRing(path, p.getInteriorRingN(i), scale, ox, oy);
            }
        }
        return path;
    }

    private static void appendRing(Path2D.Double path, LineString ring, double scale, double ox, double oy) {
        var seq = ring.getCoordinateSequence();
        for (int i = 0; i < seq.size(); i++) {
            double X = seq.getX(i) * scale + ox;
            double Y = oy - seq.getY(i) * scale;
            if (i == 0) path.moveTo(X, Y); else path.lineTo(X, Y);
        }
        path.closePath();
    }

    /** mm paper size to pixel dimension at dpi */
    public static Dimension paperToPixels(String paper, String orientation, int dpi) {
        int wmm, hmm;
        if ("A3".equalsIgnoreCase(paper)) { wmm = 420; hmm = 297; }
        else { wmm = 297; hmm = 210; } // A4 default
        boolean portrait = "portrait".equalsIgnoreCase(orientation);
        int w = portrait ? wmm : hmm;
        int h = portrait ? hmm : wmm;
        int pxW = (int)Math.round(w / 25.4 * dpi);
        int pxH = (int)Math.round(h / 25.4 * dpi);
        return new Dimension(pxW, pxH);
    }

    public static byte[] emptyPng(int w, int h) throws Exception {
        var img = new java.awt.image.BufferedImage(w, h, java.awt.image.BufferedImage.TYPE_INT_ARGB);
        var baos = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(img, "png", baos);
        return baos.toByteArray();
    }
}