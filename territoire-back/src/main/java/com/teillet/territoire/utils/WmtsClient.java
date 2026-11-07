package com.teillet.territoire.utils;

import com.teillet.territoire.config.IgnWmtsProperties;
import com.teillet.territoire.record.TileImage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class WmtsClient {

    /** Borne la mémoire (une tuile = 256x256x4 octets) et le nombre d'appels à l'IGN. */
    static final int MAX_TILES = 400;
    /** Essais par tuile : l'IGN laisse parfois passer une requête sans réponse. */
    static final int MAX_ATTEMPTS = 3;
    /** Tuiles perdues au-delà desquelles les suivantes ne sont plus réessayées : le serveur est en panne. */
    static final int MAX_FAILED_WITH_RETRIES = 3;

    /** Attente avant le deuxième essai d'une tuile, doublée avant le troisième (nulle dans les tests). */
    long retryDelayMillis = 250;

    private final IgnWmtsProperties props;

    private final HttpClient http = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    // ------------------- API publique -------------------

    /** Emprise en EPSG:3857 -> fetch, mosaïque alignée */
    public TileImage fetchTiles3857(Envelope env3857, int z) {
        // convertir bbox 3857 -> bbox 4326 pour calculer les indices de tuiles
        double minLon = Math.toDegrees(env3857.getMinX() / 6378137.0);
        double maxLon = Math.toDegrees(env3857.getMaxX() / 6378137.0);
        double minLat = Math.toDegrees(2 * Math.atan(Math.exp(env3857.getMinY() / 6378137.0)) - Math.PI/2);
        double maxLat = Math.toDegrees(2 * Math.atan(Math.exp(env3857.getMaxY() / 6378137.0)) - Math.PI/2);

        Envelope env4326 = new Envelope(minLon, maxLon, minLat, maxLat);
        return fetchTiles(env4326, z);
    }

    /** Emprise en EPSG:4326 -> assemble les tuiles WMTS alignées */
    public TileImage fetchTiles(Envelope env4326, int z) {
        z = Math.clamp(z, 0, 19);

        int xMin = MapMath.lon2tileX(env4326.getMinX(), z);
        int xMax = MapMath.lon2tileX(env4326.getMaxX(), z);
        int yMin = MapMath.lat2tileY(env4326.getMaxY(), z); // top
        int yMax = MapMath.lat2tileY(env4326.getMinY(), z); // bottom

        int cols = (xMax - xMin + 1);
        int rows = (yMax - yMin + 1);
        if ((long) cols * rows > MAX_TILES) {
            throw new IllegalArgumentException("Zone trop étendue pour ce niveau de zoom (" + (long) cols * rows
                    + " tuiles, maximum " + MAX_TILES + ") : réduisez le zoom");
        }
        int mosaicW = cols * MapMath.TILE_SIZE;
        int mosaicH = rows * MapMath.TILE_SIZE;

        // emprise exacte de la mosaïque (mètres, EPSG:3857)
        Envelope tl = MapMath.tileBoundsMeters(xMin, yMin, z);
        Envelope tr = MapMath.tileBoundsMeters(xMax, yMin, z);
        Envelope br = MapMath.tileBoundsMeters(xMax, yMax, z);
        Envelope envTiles3857 = new Envelope(tl.getMinX(), tr.getMaxX(), br.getMinY(), tl.getMaxY());

        BufferedImage img = new BufferedImage(mosaicW, mosaicH, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();

        int failedTiles = 0;
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

                // Serveur en panne : après quelques tuiles perdues, on ne réessaie plus (export de 400 tuiles)
                BufferedImage tile = fetchTile(url, failedTiles < MAX_FAILED_WITH_RETRIES ? MAX_ATTEMPTS : 1);
                if (tile != null) {
                    g.drawImage(tile, (x - xMin) * MapMath.TILE_SIZE, (y - yMin) * MapMath.TILE_SIZE, null);
                } else {
                    // fallback gris clair
                    failedTiles++;
                    g.setColor(new Color(235,235,235));
                    g.fillRect((x - xMin) * MapMath.TILE_SIZE, (y - yMin) * MapMath.TILE_SIZE, MapMath.TILE_SIZE, MapMath.TILE_SIZE);
                }
            }
        }
        g.dispose();

        if (failedTiles > 0) {
            log.warn("{} tuile(s) WMTS sur {} non servies (zoom {})", failedTiles, cols * rows, z);
        }
        return new TileImage(img, envTiles3857, mosaicW, mosaicH, failedTiles);
    }

    /**
     * Une tuile, réessayée si le serveur ne la sert pas (délai dépassé, erreur passagère de l'IGN) ; null si elle
     * manque toujours.
     */
    private BufferedImage fetchTile(String url, int attempts) {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "Territoire-Exporter/1.0")
                .timeout(Duration.ofSeconds(8))
                .GET()
                .build();

        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                HttpResponse<byte[]> resp = http.send(req, HttpResponse.BodyHandlers.ofByteArray());
                if (resp.statusCode() == 200) {
                    try (InputStream in = new ByteArrayInputStream(resp.body())) {
                        BufferedImage tile = ImageIO.read(in);
                        if (tile != null) return tile;
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            } catch (Exception e) {
                log.debug("Tuile WMTS non servie (essai {}/{}) : {}", attempt, attempts, e.getMessage());
            }
            if (attempt < attempts && !pause(retryDelayMillis * attempt)) return null;
        }
        return null;
    }

    private static boolean pause(long millis) {
        try {
            Thread.sleep(millis);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}