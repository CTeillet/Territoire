package com.teillet.territoire.utils;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class MessageTemplateRendererTest {
	private final MessageTemplateRenderer renderer = new MessageTemplateRenderer();

	@Test
	void rendersVariablesConditionsAndLoops() {
		String template = """
				Bonjour {{ person.firstName }},
				{% assign count = territories | size -%}
				{{ count }} territoire{% if count > 1 %}s{% endif %} :
				{%- for t in territories %}
				- {{ t.name }}
				{%- endfor %}""";
		Map<String, Object> data = Map.of(
				"person", Map.of("firstName", "Jean"),
				"territories", List.of(Map.of("name", "A1"), Map.of("name", "B2")));

		assertEquals("Bonjour Jean,\n2 territoires :\n- A1\n- B2", renderer.render(template, data));
	}

	@Test
	void unknownVariable_RendersEmpty() {
		assertEquals("Lien : ", renderer.render("Lien : {{ link }}", Map.of()));
	}

	@Test
	void include_IsRefused() {
		assertThrows(RuntimeException.class,
				() -> renderer.render("{% include 'application.properties' %}", Map.of()));
	}

	@Test
	void invalidTemplate_IsRejectedWithReadableMessage() {
		IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> renderer.validate("{% if %}"));
		assertTrue(e.getMessage().startsWith("Gabarit invalide"));
	}

	@Test
	void validTemplate_PassesValidation() {
		assertDoesNotThrow(() -> renderer.validate("Bonjour {{ person.firstName }}"));
	}

	@Test
	void oversizedTemplate_IsRejected() {
		assertThrows(IllegalArgumentException.class, () -> renderer.validate("x".repeat(30_000)));
	}
}
