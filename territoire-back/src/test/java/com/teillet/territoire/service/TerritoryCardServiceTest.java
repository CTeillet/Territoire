package com.teillet.territoire.service;

import com.teillet.territoire.enums.CardFraming;
import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.record.TileImage;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.repository.projection.TerritoryCardRow;
import com.teillet.territoire.service.impl.TerritoryCardService;
import com.teillet.territoire.utils.MapMath;
import com.teillet.territoire.utils.WmtsClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.MultiPolygon;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.io.WKBWriter;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TerritoryCardServiceTest {

	/** Sortie : deux fois le modèle (875 × 616). */
	private static final int SCALE = 2;
	/** Cadre du plan sur le modèle. */
	private static final Rectangle FRAME = new Rectangle(29, 120, 828, 376);

	@Mock
	private TerritoryRepository territoryRepository;

	@Mock
	private ITerritoryService territoryService;

	@Mock
	private WmtsClient wmtsClient;

	@InjectMocks
	private TerritoryCardService cardService;

	private final GeometryFactory gf = new GeometryFactory();
	private final UUID territoryId = UUID.randomUUID();

	@BeforeEach
	void blankTiles() {
		// Plan tout blanc couvrant exactement l'emprise demandée : aucune requête vers l'IGN
		lenient().when(wmtsClient.fetchTiles3857(any(Envelope.class), anyInt())).thenAnswer(invocation -> {
			Envelope extent = invocation.getArgument(0);
			BufferedImage white = new BufferedImage(256, 256, BufferedImage.TYPE_INT_ARGB);
			Graphics2D g = white.createGraphics();
			g.setColor(Color.WHITE);
			g.fillRect(0, 0, 256, 256);
			g.dispose();
			return new TileImage(white, new Envelope(extent), 256, 256);
		});
	}

	@Test
	void renderCard_UnknownTerritory_NotFound() {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.empty());

		assertThrows(NotFoundException.class, () -> cardService.renderCard(territoryId, CardFraming.NORMAL));
	}

	@Test
	void renderCard_TerritoryWithoutBlocks_Rejected() {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray", null, 0)));

		IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
				() -> cardService.renderCard(territoryId, CardFraming.NORMAL));
		assertTrue(error.getMessage().contains("pâtés"));
		verifyNoInteractions(wmtsClient);
	}

	@Test
	void renderCard_FillsTheFormAndShowsTheTerritoryInGreen() throws IOException {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray Vieille Poste", hullWkb(), 0)));

		BufferedImage card = read(cardService.renderCard(territoryId, CardFraming.NORMAL));

		assertEquals(875 * SCALE, card.getWidth());
		assertEquals(616 * SCALE, card.getHeight());
		// Territoire centré dans le cadre, en vert sur le plan blanc
		Color center = new Color(card.getRGB((int) FRAME.getCenterX() * SCALE, (int) FRAME.getCenterY() * SCALE));
		assertTrue(center.getGreen() > center.getRed() && center.getRed() > center.getBlue(), "vert attendu : " + center);
		// Ville après « Lieu », nom après « Territ. n° », au-dessus des pointillés
		assertTrue(countDark(card, new Rectangle(80, 85, 440, 22)) > 100, "ville écrite");
		assertTrue(countDark(card, new Rectangle(638, 85, 214, 22)) > 50, "nom écrit");
		// Légende verte, sans pastille rouge faute d'adresse à ne pas visiter
		assertTrue(count(card, FRAME, TerritoryCardServiceTest::isBadgeGreen) > 500, "légende verte");
		assertEquals(0, count(card, FRAME, TerritoryCardServiceTest::isBadgeRed));
	}

	@Test
	void renderCard_WithAddressesNotToDo_ShowsTheRedBadge() throws IOException {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray", hullWkb(), 3)));

		BufferedImage card = read(cardService.renderCard(territoryId, CardFraming.NORMAL));

		assertTrue(count(card, FRAME, TerritoryCardServiceTest::isBadgeRed) > 500, "pastille « numéros à ne pas faire »");
	}

	@Test
	void renderCard_LongCityName_StaysOnTheDottedLine() throws IOException {
		String longCity = "Saint-Rémy-lès-Chevreuse-sur-une-très-longue-ligne-de-texte";
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("1", longCity, hullWkb(), 0)));

		BufferedImage card = read(cardService.renderCard(territoryId, CardFraming.NORMAL));

		// Texte rétréci : rien entre la fin du pointillé de « Lieu » et « Territ. n° » (vide sur le modèle)
		assertEquals(0, countDark(card, new Rectangle(526, 85, 5, 21)));
		assertTrue(countDark(card, new Rectangle(80, 85, 440, 22)) > 100, "ville écrite");
	}

	@Test
	void saveCard_StoresThePngAsTheTerritoryMap() {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP 7", "Paray", hullWkb(), 0)));

		cardService.saveCard(territoryId, CardFraming.WIDE);

		ArgumentCaptor<byte[]> png = ArgumentCaptor.forClass(byte[].class);
		verify(territoryService).storeTerritoryMap(eq(territoryId), png.capture(), eq("carte-PVP-7.png"), eq("image/png"));
		assertDoesNotThrow(() -> read(png.getValue()));
	}

	@Test
	void mapExtent_HasTheFrameProportionsAndCentersTheTerritory() {
		Envelope territory = new Envelope(1000, 1600, 5000, 5200);

		Envelope extent = TerritoryCardService.mapExtent(territory, CardFraming.NORMAL);

		assertEquals(FRAME.getWidth() / FRAME.getHeight(), extent.getWidth() / extent.getHeight(), 1e-9);
		assertEquals(territory.centre(), extent.centre());
		// Le territoire, plus large que haut, occupe 60 % de la largeur
		assertEquals(0.6, territory.getWidth() / extent.getWidth(), 1e-9);
		assertTrue(extent.contains(territory));
	}

	@Test
	void mapExtent_WiderFramingShowsMoreAround() {
		Envelope territory = new Envelope(0, 400, 0, 400);

		double tight = TerritoryCardService.mapExtent(territory, CardFraming.TIGHT).getHeight();
		double normal = TerritoryCardService.mapExtent(territory, CardFraming.NORMAL).getHeight();
		double wide = TerritoryCardService.mapExtent(territory, CardFraming.WIDE).getHeight();

		assertTrue(tight < normal && normal < wide);
		// Territoire plus haut que large : c'est la hauteur qui compte
		assertEquals(0.6, 400 / normal, 1e-9);
	}

	@Test
	void mapExtent_TinyTerritoryKeepsItsNeighbourhood() {
		Envelope extent = TerritoryCardService.mapExtent(new Envelope(0, 10, 0, 10), CardFraming.TIGHT);

		assertEquals(350, extent.getWidth(), 1e-9);
	}

	@Test
	void zoomFor_KeepsTilesCloseToTheirSize() {
		Envelope extent = new Envelope(0, 900, 0, 900 * FRAME.getHeight() / FRAME.getWidth());

		int zoom = TerritoryCardService.zoomFor(extent);

		double tileScale = FRAME.getWidth() / (extent.getWidth() / MapMath.resolution(zoom));
		assertTrue(tileScale > 0.7 && tileScale < 1.42, "échelle des tuiles " + tileScale);
	}

	@Test
	void zoomFor_StaysWithinTheUsefulLevels() {
		assertEquals(18, TerritoryCardService.zoomFor(new Envelope(0, 1, 0, 1)));
		assertEquals(12, TerritoryCardService.zoomFor(new Envelope(0, 1_000_000, 0, 1_000_000)));
	}

	@Test
	void fileName_KeepsLettersAndDigits() {
		assertEquals("carte-PVP7.png", TerritoryCardService.fileName("PVP7"));
		assertEquals("carte-Athis-12.png", TerritoryCardService.fileName(" Athis / 12 "));
		assertEquals("carte-territoire.png", TerritoryCardService.fileName("  "));
	}

	// ------------------------------------------------------------------

	/** Carré de 200 × 100 m (EPSG:3857), comme le contour renvoyé par la base. */
	private byte[] hullWkb() {
		Polygon square = gf.createPolygon(new Coordinate[]{
				new Coordinate(260_000, 6_240_000),
				new Coordinate(260_200, 6_240_000),
				new Coordinate(260_200, 6_240_100),
				new Coordinate(260_000, 6_240_100),
				new Coordinate(260_000, 6_240_000)
		});
		MultiPolygon hull = gf.createMultiPolygon(new Polygon[]{square});
		return new WKBWriter().write(hull);
	}

	private static TerritoryCardRow row(String name, String city, byte[] hullWkb, long addressesNotToDo) {
		return new TerritoryCardRow() {
			@Override
			public String getName() { return name; }
			@Override
			public String getCityName() { return city; }
			@Override
			public byte[] getHullWkb() { return hullWkb; }
			@Override
			public Long getAddressesNotToDo() { return addressesNotToDo; }
		};
	}

	private static BufferedImage read(byte[] png) throws IOException {
		BufferedImage image = ImageIO.read(new ByteArrayInputStream(png));
		assertNotNull(image, "PNG lisible");
		return image;
	}

	/** Pixels foncés d'une zone donnée en pixels du modèle (la sortie, elle, est agrandie de SCALE). */
	private static int countDark(BufferedImage image, Rectangle templateArea) {
		int scale = image.getWidth() / 875;
		return count(image, templateArea, scale, color -> color.getRed() + color.getGreen() + color.getBlue() < 200);
	}

	private static int count(BufferedImage image, Rectangle templateArea, java.util.function.Predicate<Color> test) {
		return count(image, templateArea, SCALE, test);
	}

	private static int count(BufferedImage image, Rectangle templateArea, int scale, java.util.function.Predicate<Color> test) {
		int n = 0;
		for (int y = templateArea.y * scale; y < (templateArea.y + templateArea.height) * scale; y++) {
			for (int x = templateArea.x * scale; x < (templateArea.x + templateArea.width) * scale; x++) {
				if (test.test(new Color(image.getRGB(x, y)))) n++;
			}
		}
		return n;
	}

	private static boolean isBadgeGreen(Color c) {
		return Math.abs(c.getRed() - 129) < 6 && Math.abs(c.getGreen() - 182) < 6 && Math.abs(c.getBlue() - 26) < 6;
	}

	private static boolean isBadgeRed(Color c) {
		return c.getRed() > 200 && c.getGreen() < 40 && c.getBlue() < 60;
	}
}
