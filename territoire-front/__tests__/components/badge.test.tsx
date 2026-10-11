import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge component", () => {
  it("should render children", () => {
    render(<Badge>Actif</Badge>);
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });

  it("should apply variant classes", () => {
    render(<Badge variant="destructive">Erreur</Badge>);
    const badge = screen.getByText("Erreur");
    expect(badge).toHaveClass("bg-destructive");
  });
});
