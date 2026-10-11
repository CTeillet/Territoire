import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card component", () => {
  it("should render full card structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Titre Carte</CardTitle>
          <CardDescription>Description Carte</CardDescription>
        </CardHeader>
        <CardContent>Contenu de test</CardContent>
        <CardFooter>Pied de page</CardFooter>
      </Card>
    );

    expect(screen.getByText("Titre Carte")).toBeInTheDocument();
    expect(screen.getByText("Description Carte")).toBeInTheDocument();
    expect(screen.getByText("Contenu de test")).toBeInTheDocument();
    expect(screen.getByText("Pied de page")).toBeInTheDocument();
  });
});
