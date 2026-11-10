package com.teillet.territoire.service;

import com.teillet.territoire.enums.CardFraming;
import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.record.CardMapLayout;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.repository.projection.TerritoryCardRow;
import com.teillet.territoire.service.impl.TerritoryCardService;
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
import java.io.ByteArrayOutputStream;
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

	@InjectMocks
	private TerritoryCardService cardService;

	private final GeometryFactory gf = new GeometryFactory();
	private final UUID territoryId = UUID.randomUUID();

	@Test
	void renderCard_UnknownTerritory_NotFound() {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.empty());

		assertThrows(NotFoundException.class, () -> cardService.renderCard(territoryId, CardFraming.NORMAL, plan(Color.WHITE)));
	}

	@Test
	void renderCard_TerritoryWithoutBlocks_Rejected() {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray", null, 0)));

		IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
				() -> cardService.mapLayout(territoryId, CardFraming.NORMAL));
		assertTrue(error.getMessage().contains("pâtés"));
	}

	@Test
	void renderCard_FillsTheFormAndShowsTheTerritoryInGreen() throws IOException {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray Vieille Poste", blocksWkb(), 0)));

		BufferedImage card = read(cardService.renderCard(territoryId, CardFraming.NORMAL, plan(Color.WHITE)));

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
	void renderCard_PutsThePlanInTheFrame() throws IOException {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray", blocksWkb(), 0)));
		Color blue = new Color(170, 213, 233);

		BufferedImage card = read(cardService.renderCard(territoryId, CardFraming.NORMAL, plan(blue)));

		assertEquals(blue, planCorner(card));
		// Hors du cadre : la marge blanche du formulaire
		assertEquals(Color.WHITE, new Color(card.getRGB((FRAME.x + 30) * SCALE, 20 * SCALE)));
	}

	@Test
	void renderCard_WithAddressesNotToDo_ShowsTheRedBadge() throws IOException {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray", blocksWkb(), 3)));

		BufferedImage card = read(cardService.renderCard(territoryId, CardFraming.NORMAL, plan(Color.WHITE)));

		assertTrue(count(card, FRAME, TerritoryCardServiceTest::isBadgeRed) > 500, "pastille « numéros à ne pas faire »");
	}

	@Test
	void renderCard_LongCityName_StaysOnTheDottedLine() throws IOException {
		String longCity = "Saint-Rémy-lès-Chevreuse-sur-une-très-longue-ligne-de-texte";
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("1", longCity, blocksWkb(), 0)));

		BufferedImage card = read(cardService.renderCard(territoryId, CardFraming.NORMAL, plan(Color.WHITE)));

		// Texte rétréci : rien entre la fin du pointillé de « Lieu » et « Territ. n° » (vide sur le modèle)
		assertEquals(0, countDark(card, new Rectangle(526, 85, 5, 21)));
		assertTrue(countDark(card, new Rectangle(80, 85, 440, 22)) > 100, "ville écrite");
	}

	/** Imprimé en noir et blanc, le territoire reste plus sombre que les jardins du plan, et son contour plus encore. */
	@Test
	void renderCard_TerritoryStandsOutInBlackAndWhite() throws IOException {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray", blocksWkb(), 0)));
		Color garden = new Color(223, 232, 213);

		BufferedImage card = read(cardService.renderCard(territoryId, CardFraming.NORMAL, plan(garden)));

		double plan = luminance(planCorner(card));
		assertEquals(luminance(garden), plan, 1);
		// Intérieur du territoire (166 × 83 pixels du modèle au centre du cadre), loin de son contour
		Rectangle inside = new Rectangle((int) FRAME.getCenterX() - 50, (int) FRAME.getCenterY() - 20, 100, 40);
		assertEquals(0, count(card, inside, c -> luminance(c) > plan - 30), "remplissage plus sombre que les jardins");
		// Contour : bord gauche du territoire
		Rectangle outline = new Rectangle((int) FRAME.getCenterX() - 84, (int) FRAME.getCenterY() - 10, 3, 20);
		assertTrue(count(card, outline, c -> luminance(c) < 110) > 20, "contour foncé");
	}

	/**
	 * Le contour commun des pâtés (concave_hull) recouvrait les rues qui les séparent : chaque pâté est dessiné seul,
	 * cerné de son contour, et la rue entre eux reste celle du plan.
	 */
	@Test
	void renderCard_EachBlockIsDrawn_TheStreetBetweenStaysVisible() throws IOException {
		// Deux pâtés séparés par une rue de 20 m, soit 16,6 pixels du modèle centrés dans le cadre
		byte[] blocks = blocksWkb(block(260_000, 260_090), block(260_110, 260_200));
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray", blocks, 0)));

		BufferedImage card = read(cardService.renderCard(territoryId, CardFraming.NORMAL, plan(Color.WHITE)));

		int cx = (int) FRAME.getCenterX(), cy = (int) FRAME.getCenterY();
		Rectangle street = new Rectangle(cx - 3, cy - 20, 6, 40);
		assertEquals(0, count(card, street, c -> !c.equals(Color.WHITE)), "rue laissée blanche");
		for (int x : new int[]{cx - 45, cx + 45}) {
			Color inside = new Color(card.getRGB(x * SCALE, cy * SCALE));
			assertTrue(inside.getGreen() > inside.getRed() && inside.getRed() > inside.getBlue(), "pâté vert : " + inside);
		}
		// Contours foncés des deux pâtés, de part et d'autre de la rue
		assertTrue(count(card, new Rectangle(cx - 9, cy - 10, 2, 20), c -> luminance(c) < 110) > 20, "contour du pâté ouest");
		assertTrue(count(card, new Rectangle(cx + 7, cy - 10, 2, 20), c -> luminance(c) < 110) > 20, "contour du pâté est");
	}

	/** Deux pâtés qui se chevauchent n'assombrissent pas le vert : on ne voit que leurs contours. */
	@Test
	void renderCard_OverlappingBlocks_SameGreen() throws IOException {
		// Chevauchement de 40 m au centre du cadre
		byte[] blocks = blocksWkb(block(260_000, 260_120), block(260_080, 260_200));
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray", blocks, 0)));

		BufferedImage card = read(cardService.renderCard(territoryId, CardFraming.NORMAL, plan(Color.WHITE)));

		int cx = (int) FRAME.getCenterX(), cy = (int) FRAME.getCenterY();
		assertEquals(new Color(card.getRGB((cx - 50) * SCALE, cy * SCALE)), new Color(card.getRGB(cx * SCALE, cy * SCALE)));
	}

	@Test
	void renderCard_PlanThatIsNotAnImage_Rejected() {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray", blocksWkb(), 0)));

		IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
				() -> cardService.renderCard(territoryId, CardFraming.NORMAL, "pas une image".getBytes()));

		assertTrue(error.getMessage().contains("image"));
	}

	@Test
	void renderCard_HugePlan_RejectedBeforeDecoding() {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray", blocksWkb(), 0)));

		IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
				() -> cardService.renderCard(territoryId, CardFraming.NORMAL, png(5000, 100, Color.WHITE)));

		assertTrue(error.getMessage().contains("trop grand"));
	}

	@Test
	void saveCard_StoresThePngAsTheTerritoryMap() {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP 7", "Paray", blocksWkb(), 0)));

		cardService.saveCard(territoryId, CardFraming.WIDE, plan(Color.WHITE));

		ArgumentCaptor<byte[]> png = ArgumentCaptor.forClass(byte[].class);
		verify(territoryService).storeTerritoryMap(eq(territoryId), png.capture(), eq("carte-PVP-7.png"), eq("image/png"));
		assertDoesNotThrow(() -> read(png.getValue()));
	}

	@Test
	void saveCard_UnreadablePlan_NothingStored() {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray", blocksWkb(), 0)));

		assertThrows(IllegalArgumentException.class, () -> cardService.saveCard(territoryId, CardFraming.NORMAL, new byte[0]));

		verifyNoInteractions(territoryService);
	}

	/** Le navigateur dessine le plan sur cette emprise, que la carte reprend pour placer le territoire. */
	@Test
	void mapLayout_GivesTheExtentInDegreesAndTheFrameSize() {
		when(territoryRepository.findCardRow(territoryId)).thenReturn(Optional.of(row("PVP7", "Paray", blocksWkb(), 0)));

		CardMapLayout layout = cardService.mapLayout(territoryId, CardFraming.NORMAL);

		Envelope extent = TerritoryCardService.mapExtent(new Envelope(260_000, 260_200, 6_240_000, 6_240_100), CardFraming.NORMAL);
		assertEquals(extent.getMinX() / 20037508.342789244 * 180, layout.west(), 1e-9);
		assertEquals(extent.getMaxX() / 20037508.342789244 * 180, layout.east(), 1e-9);
		// Vers 48,8° N, comme le carré de test
		assertTrue(layout.south() > 48.7 && layout.south() < layout.north() && layout.north() < 48.9,
				layout.south() + " / " + layout.north());
		assertEquals(828, layout.width());
		assertEquals(376, layout.height());
	}

	@Test
	void mapExtent_HasTheFrameProportionsAndCentersTheTerritory() {
		Envelope territory = new Envelope(1000, 1900, 5000, 5200);

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

	/**
	 * Une barre d'immeubles (PVP33, 156 × 28 m en EPSG:3857) remplissait le cadre quel que soit le cadrage, avec un
	 * seul nom de rue : chaque cadrage a sa largeur minimale, qui double à peu près de l'un à l'autre.
	 */
	@Test
	void mapExtent_TinyTerritoryKeepsItsNeighbourhood() {
		Envelope strip = new Envelope(262_398, 262_554, 6_241_730, 6_241_758);

		for (CardFraming framing : CardFraming.values()) {
			assertEquals(framing.minExtentMeters(), TerritoryCardService.mapExtent(strip, framing).getWidth(), 1e-9);
		}
	}

	/**
	 * S103 (373 × 493 m en EPSG:3857) : le cadre étant large, le territoire imposerait 2,7 km de plan en large, où le
	 * plan IGN n'écrit plus les noms de rue. Le plan s'arrête à la largeur lisible, le territoire y tenant encore.
	 */
	@Test
	void mapExtent_LargeTerritory_KeepsReadableStreetNames() {
		Envelope territory = new Envelope(262_000, 262_373, 6_240_000, 6_240_493);

		for (CardFraming framing : CardFraming.values()) {
			Envelope extent = TerritoryCardService.mapExtent(territory, framing);

			assertTrue(extent.getWidth() <= TerritoryCardService.MAX_READABLE_EXTENT, framing.name());
			assertTrue(extent.contains(territory), framing.name());
		}
		assertEquals(TerritoryCardService.MAX_READABLE_EXTENT,
				TerritoryCardService.mapExtent(territory, CardFraming.WIDE).getWidth(), 1e-9);
	}

	/** Les noms de rue du plan IGN vectoriel apparaissent au zoom 15 : 1 978 m de large dans les 828 pixels du cadre. */
	@Test
	void mapExtent_WidestReadablePlanIsAboveTheStreetNamesZoom() {
		double zoom = Math.log(2 * 20037508.342789244 * FRAME.getWidth() / (512 * TerritoryCardService.MAX_READABLE_EXTENT))
				/ Math.log(2);

		assertTrue(zoom >= 15, "zoom " + zoom);
	}

	@Test
	void mapExtent_TooLargeForStreetNames_KeepsTheFraming() {
		Envelope territory = new Envelope(0, 3000, 0, 500);

		assertEquals(0.8, 3000 / TerritoryCardService.mapExtent(territory, CardFraming.TIGHT).getWidth(), 1e-9);
		assertEquals(0.6, 3000 / TerritoryCardService.mapExtent(territory, CardFraming.NORMAL).getWidth(), 1e-9);
		assertEquals(0.4, 3000 / TerritoryCardService.mapExtent(territory, CardFraming.WIDE).getWidth(), 1e-9);
	}

	@Test
	void fileName_KeepsLettersAndDigits() {
		assertEquals("carte-PVP7.png", TerritoryCardService.fileName("PVP7"));
		assertEquals("carte-Athis-12.png", TerritoryCardService.fileName(" Athis / 12 "));
		assertEquals("carte-territoire.png", TerritoryCardService.fileName("  "));
	}

	// ------------------------------------------------------------------

	/** Un pâté de 200 × 100 m (EPSG:3857). */
	private byte[] blocksWkb() {
		return blocksWkb(block(260_000, 260_200));
	}

	/** Pâtés réunis sans être fusionnés, comme les renvoie la base. */
	private byte[] blocksWkb(Polygon... blocks) {
		MultiPolygon collection = gf.createMultiPolygon(blocks);
		return new WKBWriter().write(collection);
	}

	/** Pâté de 100 m de haut, de minX à maxX (EPSG:3857). */
	private Polygon block(double minX, double maxX) {
		return gf.createPolygon(new Coordinate[]{
				new Coordinate(minX, 6_240_000),
				new Coordinate(maxX, 6_240_000),
				new Coordinate(maxX, 6_240_100),
				new Coordinate(minX, 6_240_100),
				new Coordinate(minX, 6_240_000)
		});
	}

	private static TerritoryCardRow row(String name, String city, byte[] blocksWkb, long addressesNotToDo) {
		return new TerritoryCardRow() {
			@Override
			public String getName() { return name; }
			@Override
			public String getCityName() { return city; }
			@Override
			public byte[] getBlocksWkb() { return blocksWkb; }
			@Override
			public Long getAddressesNotToDo() { return addressesNotToDo; }
		};
	}

	/** Plan d'une seule couleur, tel que le navigateur l'envoie : le cadre à deux pixels par pixel du modèle. */
	private static byte[] plan(Color color) {
		return png(FRAME.width * SCALE, FRAME.height * SCALE, color);
	}

	private static byte[] png(int width, int height, Color color) {
		BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
		Graphics2D g = image.createGraphics();
		g.setColor(color);
		g.fillRect(0, 0, width, height);
		g.dispose();
		try {
			ByteArrayOutputStream out = new ByteArrayOutputStream();
			ImageIO.write(image, "png", out);
			return out.toByteArray();
		} catch (IOException e) {
			throw new IllegalStateException(e);
		}
	}

	/** Plan en haut à gauche du cadre, loin du territoire, de la légende et de la source. */
	private static Color planCorner(BufferedImage card) {
		return new Color(card.getRGB((FRAME.x + 30) * SCALE, (FRAME.y + 30) * SCALE));
	}

	private static double luminance(Color c) {
		return 0.299 * c.getRed() + 0.587 * c.getGreen() + 0.114 * c.getBlue();
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
