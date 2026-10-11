import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActionButton from "@/components/shared/action-button";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("ActionButton component", () => {
  const DummyIcon = () => <svg data-testid="dummy-icon" />;

  it("should render button with icon and trigger onClick when not href", () => {
    const handleClick = vi.fn();
    render(
      <TooltipProvider>
        <ActionButton
          icon={DummyIcon}
          tooltip="Mon Action"
          onClick={handleClick}
        />
      </TooltipProvider>
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId("dummy-icon")).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should render link when href is provided", () => {
    render(
      <TooltipProvider>
        <ActionButton
          icon={DummyIcon}
          tooltip="Aller aux territoires"
          href="/territoires"
        />
      </TooltipProvider>
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/territoires");
  });
});
