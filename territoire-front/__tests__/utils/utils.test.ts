import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("utils: cn", () => {
  it("combines simple class names", () => {
    expect(cn("btn", "btn-primary")).toBe("btn btn-primary");
  });

  it("handles conditional classes properly", () => {
    const isHidden = false;
    const isPrimary = true;
    expect(cn("base", isHidden && "hidden", isPrimary && "primary")).toBe(
      "base primary"
    );
  });

  it("merges overlapping Tailwind classes", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});
