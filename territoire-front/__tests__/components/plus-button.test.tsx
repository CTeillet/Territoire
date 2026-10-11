import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlusButton from "@/components/shared/plus-button";

describe("PlusButton component", () => {
  it("should render button and respond to click events", () => {
    const handleClick = vi.fn();
    render(<PlusButton onClick={handleClick} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
