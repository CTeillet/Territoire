import { describe, it, expect } from "vitest";
import { renderTemplate, validateTemplate } from "@/lib/template";

describe("renderTemplate", () => {
  it("should render template with variables", () => {
    const template =
      "Bonjour {{ name }}, votre territoire {{ territory }} est en retard.";
    const result = renderTemplate(template, { name: "Jean", territory: "12A" });
    expect(result).toBe("Bonjour Jean, votre territoire 12A est en retard.");
  });

  it("should handle null or undefined data", () => {
    const template = "Message fixe sans variables";
    const result = renderTemplate(template, null);
    expect(result).toBe("Message fixe sans variables");
  });

  it("should handle conditionals and loops in Liquid", () => {
    const template = "{% if isLate %}Urgent: {% endif %}Territoire {{ id }}";
    expect(renderTemplate(template, { isLate: true, id: 5 })).toBe(
      "Urgent: Territoire 5"
    );
    expect(renderTemplate(template, { isLate: false, id: 5 })).toBe(
      "Territoire 5"
    );
  });
});

describe("sécurité du gabarit", () => {
  it("n'exécute pas de code JavaScript", () => {
    const payload = "{{ x.constructor.constructor }}|{{ 'a'.constructor }}";
    expect(renderTemplate(payload, { x: {} })).toBe("|");
  });

  it("gère les boucles", () => {
    expect(
      renderTemplate("{% for t in ts %}{{ t }};{% endfor %}", {
        ts: ["A", "B"],
      })
    ).toBe("A;B;");
  });
});

describe("validateTemplate", () => {
  it("accepte un gabarit valide", () => {
    expect(validateTemplate("Bonjour {{ name }}")).toBeNull();
  });
  it("rejette un gabarit invalide", () => {
    expect(validateTemplate("{% if %}")).not.toBeNull();
  });
});
