package com.teillet.territoire.service.impl;

import com.teillet.territoire.record.TileImage;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.repository.projection.Bbox3857;
import com.teillet.territoire.repository.projection.TerritoryHullRow;
import com.teillet.territoire.service.ITerritoryMapService;
import com.teillet.territoire.utils.RenderUtils;
import com.teillet.territoire.utils.WmtsClient;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.io.WKBReader;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.UUID;

import static com.teillet.territoire.utils.Utils.parseColor;

@Service
@RequiredArgsConstructor
public class TerritoryMapService implements ITerritoryMapService {

    private final TerritoryRepository territoryRepo;
    private final WmtsClient wmtsClient;

    @Override
    public byte[] generatePng(String paper, String orientation, int dpi, UUID cityId, int zoom, boolean showLabels) throws Exception {
        // 1) Taille de sortie
        Dimension outDim = RenderUtils.paperToPixels(paper, orientation, dpi);
        int width = outDim.width, height = outDim.height;

        // 2) Géométries (WKB 3857)
        List<TerritoryHullRow> rows = (cityId == null)
                ? territoryRepo.findAllProjected3857()
                : territoryRepo.findAllProjected3857ByCityId(cityId);
        if (rows.isEmpty()) return RenderUtils.emptyPng(width, height);

        // 3) Emprise EXACTE des territoires en 3857 (+ léger padding)
        Bbox3857 b = (cityId == null) ? territoryRepo.findBbox3857() : territoryRepo.findBbox3857ByCityId(cityId);
        if (b == null || b.getMinx() == null) return RenderUtils.emptyPng(width, height);

        Envelope env3857 = new Envelope(b.getMinx(), b.getMaxx(), b.getMiny(), b.getMaxy());
        // ajuste ici si tu veux moins (ex: 0.02 = 2%)
        env3857.expandBy(env3857.getWidth() * 0.03, env3857.getHeight() * 0.03);

        // 4) Télécharger les tuiles (emprise élargie à la grille WMTS)
        TileImage tiles = wmtsClient.fetchTiles3857(env3857, zoom);

        // 5) Recadrer la mosaïque SUR l’emprise exacte demandée (supprime les « zones inutiles »)
        TileImage cropped = cropToExtent(tiles, env3857);

        // 6) Canvas + fond (letterboxing, pas de déformation)
        BufferedImage out = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        double sFit = Math.min((double) width / cropped.pixelWidth(), (double) height / cropped.pixelHeight());
        int drawW = (int) Math.round(cropped.pixelWidth() * sFit);
        int drawH = (int) Math.round(cropped.pixelHeight() * sFit);
        int padX = (width - drawW) / 2;
        int padY = (height - drawH) / 2;

        g.drawImage(cropped.img(), padX, padY, drawW, drawH, null);

        // 7) Affine world(3857)->pixels basée sur L’EMPRISE RECADRÉE (== env3857)
        Envelope E = cropped.env3857(); // == env3857
        double scale = (double) drawW / E.getWidth();
        double ox = padX - E.getMinX() * scale;
        double oy = padY + E.getMaxY() * scale;

        // 8) Overlay (polygones + labels, couleurs ville)
        WKBReader reader = new WKBReader();
        g.setStroke(new BasicStroke(1.4f));
        Color halo = new Color(255, 255, 255, 220);
        g.setFont(new Font("SansSerif", Font.PLAIN, 18));

        for (TerritoryHullRow r : rows) {
            Geometry geom3857 = reader.read(r.getHullWkb());
            Shape shp = RenderUtils.toShape(geom3857, scale, ox, oy);

            Color fill = parseColor(r.getCityColorHex(), new Color(120, 120, 220, 110));
            g.setColor(fill);  g.fill(shp);
            g.setColor(new Color(45, 45, 45, 200)); g.draw(shp);
        }

        if (showLabels) {
            for (TerritoryHullRow r : rows) {
                Point p = (Point) reader.read(r.getLabelWkb());
                String text = r.getName() == null ? "" : r.getName();

                int x = (int) Math.round(p.getX() * scale + ox);
                int y = (int) Math.round(oy - p.getY() * scale);

                FontMetrics fm = g.getFontMetrics();
                int w = fm.stringWidth(text), h = fm.getAscent();

                g.setColor(halo);
                g.fillRoundRect(x - w/2 - 4, y - h, w + 8, h + 6, 6, 6);
                g.setColor(Color.BLACK);
                g.drawString(text, x - w/2, y);
            }
        }

        g.dispose();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(out, "png", baos);
        return baos.toByteArray();
    }

    /**
     * Recadre la mosaïque de tuiles afin qu’elle corresponde EXACTEMENT à l’emprise demandée.
     * On travaille en pixels de la mosaïque et en mètres (3857) pour être parfaitement cohérents.
     */
    private static TileImage cropToExtent(TileImage tiles, Envelope wanted) {
        BufferedImage mosaic = tiles.img();
        Envelope mosaicEnv = tiles.env3857();

        // facteur px/mètre dans la mosaïque
        double pxPerM_X = tiles.pixelWidth()  / mosaicEnv.getWidth();
        double pxPerM_Y = tiles.pixelHeight() / mosaicEnv.getHeight();

        // rectangle de crop en px par rapport au raster mosaïque
        int cropX = (int) Math.round((wanted.getMinX() - mosaicEnv.getMinX()) * pxPerM_X);
        int cropY = (int) Math.round((mosaicEnv.getMaxY() - wanted.getMaxY()) * pxPerM_Y);
        int cropW = (int) Math.round(wanted.getWidth()  * pxPerM_X);
        int cropH = (int) Math.round(wanted.getHeight() * pxPerM_Y);

        // borne dans les limites
        cropX = Math.max(0, Math.min(cropX, mosaic.getWidth()  - 1));
        cropY = Math.max(0, Math.min(cropY, mosaic.getHeight() - 1));
        if (cropX + cropW > mosaic.getWidth())  cropW = mosaic.getWidth()  - cropX;
        if (cropY + cropH > mosaic.getHeight()) cropH = mosaic.getHeight() - cropY;

        BufferedImage croppedImg = mosaic.getSubimage(cropX, cropY, Math.max(1, cropW), Math.max(1, cropH));

        // IMPORTANT : l’emprise du raster recadré devient l’emprise voulue (wanted)
        return new TileImage(croppedImg, new Envelope(
                wanted.getMinX(), wanted.getMaxX(), wanted.getMinY(), wanted.getMaxY()
        ), croppedImg.getWidth(), croppedImg.getHeight());
    }
}