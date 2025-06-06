"use client";

import React from "react";

interface StatCardProps {
  title: string;
  value: number;
  valueClassName?: string;
}

/**
 * A card component for displaying a statistic with a title and value
 */
export function StatCard({ title, value, valueClassName = "text-3xl font-bold" }: StatCardProps) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className={valueClassName}>{value}</p>
    </div>
  );
}