import React from "react";

/** ResponsiveContainer de taille fixe : jsdom n'a pas de mise en page, Recharts dessinerait un graphique vide. */
export async function rechartsWithFixedSize(
  importOriginal: () => Promise<typeof import("recharts")>
) {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactElement<{ width?: number; height?: number }>;
    }) => (
      <div style={{ width: 800, height: 400 }}>
        {React.cloneElement(children, { width: 800, height: 400 })}
      </div>
    ),
  };
}
