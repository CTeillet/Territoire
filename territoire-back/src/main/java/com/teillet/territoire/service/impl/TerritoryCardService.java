package com.teillet.territoire.service.impl;

import com.teillet.territoire.enums.CardFraming;
import com.teillet.territoire.exception.NotFoundException;
import com.teillet.territoire.record.TileImage;
import com.teillet.territoire.repository.TerritoryRepository;
import com.teillet.territoire.repository.projection.TerritoryCardRow;
import com.teillet.territoire.service.ITerritoryCardService;
import com.teillet.territoire.service.ITerritoryService;
import com.teillet.territoire.utils.MapMath;
import com.teillet.territoire.utils.RenderUtils;
import com.teillet.territoire.utils.WmtsClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKBReader;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.font.FontRenderContext;
import java.awt.geom.AffineTransform;
import java.awt.geom.Rectangle2D;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Carte physique d'un territoire, dessinée sur le formulaire « Carte de territoire » du modèle GIMP : la ville après
 * « Lieu », le nom après « Territ. n° » et, au milieu, le plan IGN du quartier où le territoire ressort en vert.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TerritoryCardService implements ITerritoryCardService {

	/** Formulaire vierge (calque « Fond » du modèle GIMP) : toutes les positions ci-dessous sont en pixels de cette image. */
	private static final String TEMPLATE_RESOURCE = "/cards/fond-carte-territoire.png";
	static final int TEMPLATE_WIDTH = 875;
	static final int TEMPLATE_HEIGHT = 616;
	/** La sortie fait deux fois le modèle, 1750 × 1232 px : 300 dpi sur un quart de feuille A4 (A6). */
	static final int SCALE = 2;

	/** Cadre du plan, entre la ligne « Lieu … Territ. n° » et le texte du bas, aux coins arrondis comme sur le modèle. */
	static final Rectangle2D MAP_FRAME = new Rectangle2D.Double(29, 120, 828, 376);
	private static final double MAP_CORNER = 12;
	private static final Color MAP_BORDER = new Color(156, 163, 175);

	// Champs à remplir : du début du pointillé à sa fin, sur la ligne de « Lieu » et « Territ. n° »
	static final double CITY_X = 80, CITY_END_X = 522;
	static final double NAME_X = 638, NAME_END_X = 852;
	static final float FIELD_BASELINE = 107;
	/** Hauteur des majuscules des champs, comme sur le modèle. */
	private static final double FIELD_CAP_HEIGHT = 18;

	/** Vert des pâtés à travailler du modèle ; le remplissage laisse lire les noms de rue dessous. */
	static final Color GREEN = new Color(129, 182, 26);
	private static final Color GREEN_FILL = new Color(129, 182, 26, 125);
	private static final Color GREEN_OUTLINE = new Color(76, 120, 10);
	static final Color RED = new Color(226, 1, 25);

	// Pastilles de légende du modèle, dans un coin du plan
	private static final double BADGE_HEIGHT = 24, BADGE_PADDING = 9, BADGE_GAP = 6, BADGE_MARGIN = 10;
	private static final double BADGE_CAP_HEIGHT = 10;

	/** Niveaux de zoom des tuiles : au-delà de 18, Plan IGN n'apporte plus rien ; en deçà de 12, on ne lit plus les rues. */
	static final int MIN_ZOOM = 12, MAX_ZOOM = 18;

	private static final BufferedImage TEMPLATE = loadTemplate();

	private final TerritoryRepository territoryRepository;
	private final ITerritoryService territoryService;
	private final WmtsClient wmtsClient;

	@Override
	public byte[] renderCard(UUID territoryId, CardFraming framing) {
		return render(findCardRow(territoryId), framing);
	}

	@Override
	public void saveCard(UUID territoryId, CardFraming framing) {
		// Tuiles téléchargées hors transaction : seul l'enregistrement en ouvre une
		TerritoryCardRow row = findCardRow(territoryId);
		byte[] png = render(row, framing);
		territoryService.storeTerritoryMap(territoryId, png, fileName(row.getName()), MediaType.IMAGE_PNG_VALUE);
		log.info("Carte physique enregistrée pour le territoire {} ({} ko)", row.getName(), png.length / 1024);
	}

	private TerritoryCardRow findCardRow(UUID territoryId) {
		TerritoryCardRow row = territoryRepository.findCardRow(territoryId)
				.orElseThrow(() -> new NotFoundException("Territoire non trouvé"));
		if (row.getHullWkb() == null) {
			throw new IllegalArgumentException(
					"Ce territoire n'a pas encore de pâtés : dessinez-les sur sa carte avant de générer la carte physique");
		}
		return row;
	}

	private byte[] render(TerritoryCardRow row, CardFraming framing) {
		Geometry hull = readWkb(row.getHullWkb());
		boolean hasAddressesNotToDo = row.getAddressesNotToDo() != null && row.getAddressesNotToDo() > 0;

		BufferedImage card = new BufferedImage(TEMPLATE_WIDTH * SCALE, TEMPLATE_HEIGHT * SCALE, BufferedImage.TYPE_INT_RGB);
		Graphics2D g = card.createGraphics();
		try {
			g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
			g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
			g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
			g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
			g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
			// Dessin dans les coordonnées du modèle : textes et contours sont tracés à la résolution de la sortie
			g.scale(SCALE, SCALE);
			g.drawImage(TEMPLATE, 0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT, null);

			drawMap(g, hull, framing, hasAddressesNotToDo);
			drawField(g, row.getCityName(), CITY_X, CITY_END_X);
			drawField(g, row.getName(), NAME_X, NAME_END_X);
		} finally {
			g.dispose();
		}
		return toPng(card);
	}

	private void drawMap(Graphics2D g, Geometry hull, CardFraming framing, boolean hasAddressesNotToDo) {
		Envelope extent = mapExtent(hull.getEnvelopeInternal(), framing);
		TileImage tiles = wmtsClient.fetchTiles3857(extent, zoomFor(extent));
		// Une tuile manquante laisserait un carré gris sur la carte imprimée
		if (tiles.failedTiles() > 0) {
			throw new IllegalStateException("Le plan IGN n'a pas pu être chargé en entier : réessayez dans un instant");
		}

		// Pixels du modèle par mètre : l'emprise a les proportions du cadre
		double scale = MAP_FRAME.getWidth() / extent.getWidth();
		Shape frame = new RoundRectangle2D.Double(MAP_FRAME.getX(), MAP_FRAME.getY(),
				MAP_FRAME.getWidth(), MAP_FRAME.getHeight(), MAP_CORNER, MAP_CORNER);
		Shape previousClip = g.getClip();
		g.clip(frame);

		Envelope mosaic = tiles.env3857();
		double tileResolution = mosaic.getWidth() / tiles.pixelWidth();
		AffineTransform tilesToFrame = AffineTransform.getTranslateInstance(
				MAP_FRAME.getX() + (mosaic.getMinX() - extent.getMinX()) * scale,
				MAP_FRAME.getY() + (extent.getMaxY() - mosaic.getMaxY()) * scale);
		tilesToFrame.scale(tileResolution * scale, tileResolution * scale);
		g.drawImage(tiles.img(), tilesToFrame, null);

		Shape territory = RenderUtils.toShape(hull, scale,
				MAP_FRAME.getX() - extent.getMinX() * scale,
				MAP_FRAME.getY() + extent.getMaxY() * scale);
		g.setColor(GREEN_FILL);
		g.fill(territory);
		g.setColor(GREEN_OUTLINE);
		g.setStroke(new BasicStroke(2f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
		g.draw(territory);

		Corner legend = drawLegend(g, territory, hasAddressesNotToDo);
		drawAttribution(g, legend == Corner.BOTTOM_LEFT);
		g.setClip(previousClip);

		// Bordure fine : le plan IGN a de grands aplats blancs qui se confondraient avec la carte
		g.setColor(MAP_BORDER);
		g.setStroke(new BasicStroke(1f));
		g.draw(frame);
	}

	/**
	 * Emprise du plan (EPSG:3857), aux proportions du cadre et centrée sur le territoire, qui en occupe la part
	 * demandée par le cadrage. Un petit territoire prend la largeur minimale du cadrage : sans elle, une barre
	 * d'immeubles remplirait le cadre au zoom maximal, avec un seul nom de rue, quel que soit le cadrage choisi.
	 */
	public static Envelope mapExtent(Envelope territory, CardFraming framing) {
		double aspect = MAP_FRAME.getWidth() / MAP_FRAME.getHeight();
		double width = Math.max(framing.minExtentMeters(),
				Math.max(territory.getWidth(), territory.getHeight() * aspect) / framing.share());
		double height = width / aspect;
		Coordinate center = territory.centre();
		return new Envelope(center.x - width / 2, center.x + width / 2, center.y - height / 2, center.y + height / 2);
	}

	/**
	 * Niveau de zoom dont les tuiles gardent à peu près leur taille sur le modèle (entre 0,7 et 1,4 fois) : imprimés,
	 * les noms de rue ont la taille de ceux du modèle.
	 */
	public static int zoomFor(Envelope extent) {
		double ideal = Math.log(2 * MapMath.ORIGIN_SHIFT * MAP_FRAME.getWidth() / (MapMath.TILE_SIZE * extent.getWidth()))
				/ Math.log(2);
		return Math.clamp(Math.round(ideal), MIN_ZOOM, MAX_ZOOM);
	}

	/** Pastilles de légende du modèle, dans le premier coin du plan qui ne cache pas le territoire. */
	private static Corner drawLegend(Graphics2D g, Shape territory, boolean hasAddressesNotToDo) {
		List<Badge> badges = hasAddressesNotToDo
				? List.of(new Badge("PÂTÉS À TRAVAILLER", GREEN), new Badge("NUMÉROS À NE PAS FAIRE : VOIR AU DOS", RED))
				: List.of(new Badge("PÂTÉS À TRAVAILLER", GREEN));
		Font font = fontWithCapHeight(g, Font.BOLD, BADGE_CAP_HEIGHT);
		FontRenderContext frc = g.getFontRenderContext();
		double[] widths = badges.stream()
				.mapToDouble(badge -> font.getStringBounds(badge.text(), frc).getWidth() + 2 * BADGE_PADDING)
				.toArray();
		double blockWidth = Arrays.stream(widths).max().orElse(0);
		double blockHeight = badges.size() * BADGE_HEIGHT + (badges.size() - 1) * BADGE_GAP;

		Corner corner = Arrays.stream(Corner.values())
				.filter(candidate -> !territory.intersects(legendArea(candidate, blockWidth, blockHeight)))
				.findFirst()
				.orElse(Corner.BOTTOM_RIGHT);
		Rectangle2D area = legendArea(corner, blockWidth, blockHeight);

		g.setFont(font);
		for (int i = 0; i < badges.size(); i++) {
			double x = corner.right ? area.getMaxX() - widths[i] : area.getX();
			double y = area.getY() + i * (BADGE_HEIGHT + BADGE_GAP);
			g.setColor(badges.get(i).color());
			g.fill(new RoundRectangle2D.Double(x, y, widths[i], BADGE_HEIGHT, 8, 8));
			g.setColor(Color.WHITE);
			g.drawString(badges.get(i).text(), (float) (x + BADGE_PADDING), (float) (y + (BADGE_HEIGHT + BADGE_CAP_HEIGHT) / 2));
		}
		return corner;
	}

	private static Rectangle2D legendArea(Corner corner, double width, double height) {
		double x = corner.right ? MAP_FRAME.getMaxX() - BADGE_MARGIN - width : MAP_FRAME.getX() + BADGE_MARGIN;
		double y = corner.bottom ? MAP_FRAME.getMaxY() - BADGE_MARGIN - height : MAP_FRAME.getY() + BADGE_MARGIN;
		return new Rectangle2D.Double(x, y, width, height);
	}

	/** Source du plan (licence ouverte Etalab), en petit dans un coin du bas que la légende laisse libre. */
	private static void drawAttribution(Graphics2D g, boolean right) {
		String text = "© IGN – Plan IGN";
		Font font = new Font(Font.SANS_SERIF, Font.PLAIN, 8);
		Rectangle2D bounds = font.getStringBounds(text, g.getFontRenderContext());
		double width = bounds.getWidth() + 6, height = bounds.getHeight() + 2;
		// Décalé des coins arrondis du cadre
		double x = right ? MAP_FRAME.getMaxX() - MAP_CORNER - width : MAP_FRAME.getX() + MAP_CORNER;
		double y = MAP_FRAME.getMaxY() - height;
		g.setColor(new Color(255, 255, 255, 200));
		g.fill(new Rectangle2D.Double(x, y, width, height));
		g.setColor(new Color(55, 65, 81));
		g.setFont(font);
		g.drawString(text, (float) (x + 3), (float) (y + 1 - bounds.getY()));
	}

	/** Valeur d'un champ du formulaire, en majuscules comme sur le modèle, rétrécie si elle dépasse le pointillé. */
	private static void drawField(Graphics2D g, String value, double x, double endX) {
		if (value == null || value.isBlank()) return;
		String text = value.strip().toUpperCase(Locale.FRENCH);
		Font font = fontWithCapHeight(g, Font.PLAIN, FIELD_CAP_HEIGHT);
		double width = font.getStringBounds(text, g.getFontRenderContext()).getWidth();
		if (width > endX - x) {
			font = font.deriveFont((float) (font.getSize2D() * (endX - x) / width));
		}
		g.setFont(font);
		g.setColor(Color.BLACK);
		g.drawString(text, (float) x, FIELD_BASELINE);
	}

	/** Police sans empattement dont les majuscules font capHeight pixels du modèle (la taille en points varie selon la police installée). */
	private static Font fontWithCapHeight(Graphics2D g, int style, double capHeight) {
		Font reference = new Font(Font.SANS_SERIF, style, 100);
		double referenceCapHeight = reference.createGlyphVector(g.getFontRenderContext(), "H").getVisualBounds().getHeight();
		return reference.deriveFont((float) (100 * capHeight / referenceCapHeight));
	}

	/** Nom du fichier enregistré, repris au téléchargement : « carte-PVP7.png ». */
	public static String fileName(String territoryName) {
		String safe = territoryName == null ? ""
				: territoryName.strip().replaceAll("[^\\p{L}\\p{N}_-]+", "-").replaceAll("^-+|-+$", "");
		return "carte-" + (safe.isEmpty() ? "territoire" : safe) + ".png";
	}

	private static Geometry readWkb(byte[] wkb) {
		try {
			return new WKBReader().read(wkb);
		} catch (ParseException e) {
			throw new IllegalStateException("Contour du territoire illisible", e);
		}
	}

	private static byte[] toPng(BufferedImage image) {
		try {
			ByteArrayOutputStream out = new ByteArrayOutputStream();
			ImageIO.write(image, "png", out);
			return out.toByteArray();
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	private static BufferedImage loadTemplate() {
		try (InputStream in = TerritoryCardService.class.getResourceAsStream(TEMPLATE_RESOURCE)) {
			if (in == null) {
				throw new IllegalStateException("Fond de la carte introuvable : " + TEMPLATE_RESOURCE);
			}
			return ImageIO.read(in);
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	private record Badge(String text, Color color) {}

	/** Coins du plan, par ordre de préférence pour la légende : en bas à droite comme sur le modèle. */
	private enum Corner {
		BOTTOM_RIGHT(true, true), BOTTOM_LEFT(false, true), TOP_RIGHT(true, false), TOP_LEFT(false, false);

		final boolean right;
		final boolean bottom;

		Corner(boolean right, boolean bottom) {
			this.right = right;
			this.bottom = bottom;
		}
	}
}
