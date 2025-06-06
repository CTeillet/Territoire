"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GridContainerProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  mdColumns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 4 | 6 | 8;
  className?: string;
}

/**
 * A responsive grid container component
 */
export function GridContainer({ 
  children, 
  columns = 1, 
  mdColumns, 
  gap = 6, 
  className 
}: GridContainerProps) {
  // Map the numeric values to the corresponding Tailwind classes
  const getColumnsClass = (cols: number) => {
    const classMap: Record<number, string> = {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6"
    };
    return classMap[cols] || "grid-cols-1";
  };

  const getMdColumnsClass = (cols?: number) => {
    if (!cols) return "";
    const classMap: Record<number, string> = {
      1: "md:grid-cols-1",
      2: "md:grid-cols-2",
      3: "md:grid-cols-3",
      4: "md:grid-cols-4",
      5: "md:grid-cols-5",
      6: "md:grid-cols-6"
    };
    return classMap[cols] || "";
  };

  const getGapClass = (gapSize: number) => {
    const classMap: Record<number, string> = {
      4: "gap-4",
      6: "gap-6",
      8: "gap-8"
    };
    return classMap[gapSize] || "gap-6";
  };

  return (
    <div 
      className={cn(
        "grid",
        getColumnsClass(columns),
        getMdColumnsClass(mdColumns),
        getGapClass(gap),
        className
      )}
    >
      {children}
    </div>
  );
}
