// Shared interfaces for chart data used across the application

/**
 * Data structure for territory status pie chart
 */
export interface TerritoryStatusData {
  name: string;
  value: number;
  key: string;
}

/**
 * Data structure for territory type bar chart
 */
export interface TerritoryTypeData {
  name: string;
  used: number;
  available: number;
}