import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatCard from "@/components/dashboard/stat-card";

describe("StatCard component", () => {
  it("should render title and count correctly", () => {
    render(<StatCard title="Territoires Disponibles" count={42} />);
    expect(screen.getByText("Territoires Disponibles")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
