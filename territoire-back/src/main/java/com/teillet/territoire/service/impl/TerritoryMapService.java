package com.teillet.territoire.service.impl;

import com.teillet.territoire.record.TileImage;
import com.teillet.territoire.repository.projection.Bbox4326;
import com.teillet.territoire.repository.projection.TerritoryHullRow;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.service.ITerritoryMapService;
import com.teillet.territoire.utils.RenderUtils;
import com.teillet.territoire.utils.WmtsClient;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.*;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.io.WKBReader;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.Dimension;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.*;
import java.util.List;

import static com.teillet.territoire.utils.Utils.parseColor;

@Service
@RequiredArgsConstructor
public class TerritoryMapService implements ITerritoryMapService {

    private final TerritoryRepository territoryRepo;
    private final WmtsClient wmtsClient;

    @Override
    public byte[] generatePng(String paper, String orientation, int dpi, UUID cityId, int zoom) throws Exception {
        // 1) taille de sortie
        Dimension outDim = RenderUtils.paperToPixels(paper, orientation, dpi);
        int width = outDim.width, height = outDim.height;

        // 2) géométries (WKB 3857)
        List<TerritoryHullRow> rows = (cityId == null)
                ? territoryRepo.findAllProjected3857()
                : territoryRepo.findAllProjected3857ByCityId(cityId);
        if (rows.isEmpty()) return RenderUtils.emptyPng(width, height);

        // 3) bbox 4326 -> padding -> fetch tiles
        Bbox4326 b = (cityId == null) ? territoryRepo.findBbox4326() : territoryRepo.findBbox4326ByCityId(cityId);
        if (b == null || b.getMinx() == null) return RenderUtils.emptyPng(width, height);
        Envelope env4326 = new Envelope(b.getMinx(), b.getMaxx(), b.getMiny(), b.getMaxy());
        env4326.expandBy(env4326.getWidth() * 0.05, env4326.getHeight() * 0.05);

        TileImage tiles = wmtsClient.fetchTiles(env4326, zoom);

        // 4) canvas + draw background (respect ratio -> letterboxing)
        BufferedImage out = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        double sFit = Math.min((double) width / tiles.pixelWidth(), (double) height / tiles.pixelHeight());
        int drawW = (int) Math.round(tiles.pixelWidth() * sFit);
        int drawH = (int) Math.round(tiles.pixelHeight() * sFit);
        int padX = (width - drawW) / 2;
        int padY = (height - drawH) / 2;

        g.drawImage(tiles.img(), padX, padY, drawW, drawH, null);

        // 5) world(3857) -> pixels based on tile extent + same padding
        Envelope E = tiles.env3857();
        double scale = (double) drawW / E.getWidth(); // == drawH/E.getHeight()
        double ox = padX - E.getMinX() * scale;
        double oy = padY + E.getMaxY() * scale;

        // 6) overlay (polygons + labels)
        WKBReader reader = new WKBReader();
        g.setStroke(new BasicStroke(1.4f));
        Color halo = new Color(255,255,255,220);
        g.setFont(new Font("SansSerif", Font.PLAIN, 18));

        for (TerritoryHullRow r : rows) {
            Geometry geom3857 = reader.read(r.getHullWkb());
            Shape shp = RenderUtils.toShape(geom3857, scale, ox, oy);

            // couleur de la ville ou fallback
            Color fill = parseColor(r.getCityColorHex(), new Color(120, 120, 220, 110));
            g.setColor(fill);
            g.fill(shp);

            g.setColor(new Color(45, 45, 45, 200)); // contour fixe
            g.draw(shp);
        }

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

        g.dispose();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(out, "png", baos);
        return baos.toByteArray();
    }
}