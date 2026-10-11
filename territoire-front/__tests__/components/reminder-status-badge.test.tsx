import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReminderStatusBadge } from "@/components/late-territory/reminder-status-badge";

describe("ReminderStatusBadge", () => {
  it("should show 'Rappel envoyé' when hasReminder is true", () => {
    render(<ReminderStatusBadge hasReminder={true} />);
    expect(screen.getByText("Rappel envoyé")).toBeInTheDocument();
  });

  it("should show 'Pas de rappel' when hasReminder is false", () => {
    render(<ReminderStatusBadge hasReminder={false} />);
    expect(screen.getByText("Pas de rappel")).toBeInTheDocument();
  });
});
