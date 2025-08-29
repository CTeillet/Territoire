package com.teillet.territoire.utils;


import com.teillet.territoire.config.IgnWmtsProperties;
import com.teillet.territoire.record.TileImage;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Envelope;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class WmtsClient {

    private final IgnWmtsProperties props;

    private final HttpClient http = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public TileImage fetchTiles(Envelope env4326, int z) {
        z = Math.max(0, Math.min(19, z));

        int xMin = MapMath.lon2tileX(env4326.getMinX(), z);
        int xMax = MapMath.lon2tileX(env4326.getMaxX(), z);
        int yMin = MapMath.lat2tileY(env4326.getMaxY(), z); // top
        int yMax = MapMath.lat2tileY(env4326.getMinY(), z); // bottom

        int cols = (xMax - xMin + 1);
        int rows = (yMax - yMin + 1);
        int mosaicW = cols * MapMath.TILE_SIZE;
        int mosaicH = rows * MapMath.TILE_SIZE;

        // exact mosaic extent in meters (EPSG:3857)
        Envelope tl = MapMath.tileBoundsMeters(xMin, yMin, z);
        Envelope tr = MapMath.tileBoundsMeters(xMax, yMin, z);
        Envelope br = MapMath.tileBoundsMeters(xMax, yMax, z);
        Envelope envTiles3857 = new Envelope(tl.getMinX(), tr.getMaxX(), br.getMinY(), tl.getMaxY());

        BufferedImage img = new BufferedImage(mosaicW, mosaicH, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();

        for (int x = xMin; x <= xMax; x++) {
            for (int y = yMin; y <= yMax; y++) {
                String url = String.format(Locale.ROOT,
                        "%s?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&" +
                                "LAYER=%s&STYLE=%s&FORMAT=%s&" +
                                "TILEMATRIXSET=PM&TILEMATRIX=%d&TILEROW=%d&TILECOL=%d",
                        props.getWmtsBase(),
                        enc(props.getLayer()), enc(props.getStyle()), enc(props.getFormat()),
                        z, y, x
                );

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("User-Agent", "Territoire-Exporter/1.0")
                        .timeout(Duration.ofSeconds(8))
                        .GET()
                        .build();

                try {
                    HttpResponse<byte[]> resp = http.send(req, HttpResponse.BodyHandlers.ofByteArray());
                    if (resp.statusCode() == 200) {
                        try (InputStream in = new ByteArrayInputStream(resp.body())) {
                            BufferedImage tile = ImageIO.read(in);
                            if (tile != null) {
                                g.drawImage(tile, (x - xMin) * MapMath.TILE_SIZE, (y - yMin) * MapMath.TILE_SIZE, null);
                                continue;
                            }
                        }
                    }
                    // fallback gris clair
                    g.setColor(new Color(235,235,235));
                    g.fillRect((x - xMin) * MapMath.TILE_SIZE, (y - yMin) * MapMath.TILE_SIZE, MapMath.TILE_SIZE, MapMath.TILE_SIZE);
                } catch (Exception e) {
                    g.setColor(new Color(235,235,235));
                    g.fillRect((x - xMin) * MapMath.TILE_SIZE, (y - yMin) * MapMath.TILE_SIZE, MapMath.TILE_SIZE, MapMath.TILE_SIZE);
                }
            }
        }
        g.dispose();

        return new TileImage(img, envTiles3857, mosaicW, mosaicH);
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}