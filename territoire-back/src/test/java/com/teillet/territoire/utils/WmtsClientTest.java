package com.teillet.territoire.utils;

import com.sun.net.httpserver.HttpServer;
import com.teillet.territoire.config.IgnWmtsProperties;
import com.teillet.territoire.record.TileImage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Envelope;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tuiles servies par un faux serveur WMTS local : aucune requête vers l'IGN.
 */
class WmtsClientTest {
	private HttpServer server;
	private final AtomicInteger requests = new AtomicInteger();
	private volatile boolean failTiles;
	private WmtsClient client;

	@BeforeEach
	void setUp() throws IOException {
		server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/wmts", exchange -> {
			requests.incrementAndGet();
			if (failTiles) {
				exchange.sendResponseHeaders(503, -1);
				exchange.close();
				return;
			}
			byte[] png = redTile();
			exchange.getResponseHeaders().add("Content-Type", "image/png");
			exchange.sendResponseHeaders(200, png.length);
			exchange.getResponseBody().write(png);
			exchange.close();
		});
		server.start();

		IgnWmtsProperties props = new IgnWmtsProperties();
		props.setWmtsBase("http://127.0.0.1:" + server.getAddress().getPort() + "/wmts");
		props.setLayer("LAYER");
		props.setStyle("normal");
		props.setFormat("image/png");
		client = new WmtsClient(props);
	}

	@AfterEach
	void tearDown() {
		server.stop(0);
	}

	private static byte[] redTile() throws IOException {
		BufferedImage tile = new BufferedImage(MapMath.TILE_SIZE, MapMath.TILE_SIZE, BufferedImage.TYPE_INT_RGB);
		Graphics2D g = tile.createGraphics();
		g.setColor(Color.RED);
		g.fillRect(0, 0, MapMath.TILE_SIZE, MapMath.TILE_SIZE);
		g.dispose();
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		ImageIO.write(tile, "png", out);
		return out.toByteArray();
	}

	/** Petite emprise autour de Rennes (EPSG:4326). */
	private static Envelope rennes(double sizeDegrees) {
		return new Envelope(-1.68, -1.68 + sizeDegrees, 48.11, 48.11 + sizeDegrees);
	}

	@Test
	void fetchTiles_AssemblesMosaicFromServedTiles() {
		TileImage mosaic = client.fetchTiles(rennes(0.005), 15);

		assertTrue(requests.get() >= 1);
		assertEquals(mosaic.pixelWidth() % MapMath.TILE_SIZE, 0);
		assertEquals(Color.RED.getRGB(), mosaic.img().getRGB(5, 5));
		assertTrue(mosaic.env3857().getWidth() > 0);
	}

	@Test
	void fetchTiles_FailedTiles_FallBackToGrey() {
		failTiles = true;

		TileImage mosaic = client.fetchTiles(rennes(0.005), 15);

		assertEquals(new Color(235, 235, 235).getRGB(), mosaic.img().getRGB(5, 5));
	}

	@Test
	void fetchTiles_TooManyTiles_RejectedBeforeAnyRequest() {
		IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
				() -> client.fetchTiles(rennes(0.5), 18));

		assertTrue(e.getMessage().contains("réduisez le zoom"));
		assertEquals(0, requests.get());
	}

	@Test
	void fetchTiles3857_ConvertsExtent() {
		Envelope env4326 = rennes(0.005);
		double minX = Math.toRadians(env4326.getMinX()) * 6378137.0;
		double maxX = Math.toRadians(env4326.getMaxX()) * 6378137.0;
		double minY = Math.log(Math.tan(Math.PI / 4 + Math.toRadians(env4326.getMinY()) / 2)) * 6378137.0;
		double maxY = Math.log(Math.tan(Math.PI / 4 + Math.toRadians(env4326.getMaxY()) / 2)) * 6378137.0;

		TileImage mosaic = client.fetchTiles3857(new Envelope(minX, maxX, minY, maxY), 15);

		assertTrue(mosaic.env3857().contains(new Envelope(minX, maxX, minY, maxY)));
	}

	@Test
	void fetchTiles_ZoomIsClampedTo19() {
		TileImage mosaic = client.fetchTiles(rennes(0.0001), 25);

		assertNotNull(mosaic.img());
	}

	@Test
	void fetchTiles_ServerUnreachable_FallsBackToGrey() {
		IgnWmtsProperties props = new IgnWmtsProperties();
		props.setWmtsBase("http://127.0.0.1:" + server.getAddress().getPort() + "/wmts");
		props.setLayer("LAYER");
		props.setStyle("normal");
		props.setFormat("image/png");
		server.stop(0);

		TileImage mosaic = new WmtsClient(props).fetchTiles(rennes(0.005), 15);

		assertEquals(new Color(235, 235, 235).getRGB(), mosaic.img().getRGB(5, 5));
	}
}
