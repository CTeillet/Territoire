package com.teillet.territoire.utils;

import liqp.Template;
import liqp.TemplateParser;
import liqp.parser.Flavor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Rendu des gabarits Liquid des messages (même syntaxe que liquidjs côté front).
 * <p>
 * Les gabarits sont saisis par des responsables : le rendu est borné (taille, itérations, durée),
 * ne reçoit que des {@link Map} de valeurs simples et la balise {@code include} (lecture de fichiers) est désactivée.
 */
@Component
public class MessageTemplateRenderer {
	private static final int MAX_TEMPLATE_BYTES = 20_000;

	private final TemplateParser parser = new TemplateParser.Builder()
			.withFlavor(Flavor.LIQUID)
			.withErrorMode(TemplateParser.ErrorMode.STRICT)
			.withStrictVariables(false)
			.withMaxTemplateSizeBytes(MAX_TEMPLATE_BYTES)
			.withMaxIterations(1_000)
			.withMaxSizeRenderedString(10_000)
			.withMaxRenderTimeMillis(1_000)
			.withNameResolver(name -> {
				throw new IllegalArgumentException("La balise include n'est pas autorisée");
			})
			.build();

	public String render(String template, Map<String, Object> data) {
		Template parsed = parse(template);
		return parsed.render(data);
	}

	/**
	 * Vérifie qu'un gabarit est valide.
	 *
	 * @throws IllegalArgumentException avec un message lisible si le gabarit est invalide
	 */
	public void validate(String template) {
		parse(template);
	}

	private Template parse(String template) {
		String source = template == null ? "" : template;
		// Liqp n'applique pas withMaxTemplateSizeBytes à parse(String) : la limite est vérifiée ici
		if (source.getBytes(StandardCharsets.UTF_8).length > MAX_TEMPLATE_BYTES) {
			throw new IllegalArgumentException("Gabarit trop long (" + MAX_TEMPLATE_BYTES + " octets maximum)");
		}
		try {
			return parser.parse(source);
		} catch (RuntimeException e) {
			throw new IllegalArgumentException("Gabarit invalide : " + e.getMessage(), e);
		}
	}
}
