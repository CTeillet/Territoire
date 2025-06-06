"use client";

import React, { ReactNode } from "react";

interface TableWrapperProps {
  title: string;
  children: ReactNode;
}

/**
 * A wrapper component for tables with consistent styling
 */
export function TableWrapper({ title, children }: TableWrapperProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}