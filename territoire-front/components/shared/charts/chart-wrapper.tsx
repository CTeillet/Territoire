"use client";

import React, { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

interface ChartWrapperProps {
  title: string;
  children: ReactElement;
}

/**
 * A wrapper component for charts with consistent styling
 */
export function ChartWrapper({ title, children }: ChartWrapperProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
