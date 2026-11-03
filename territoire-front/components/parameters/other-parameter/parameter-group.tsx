import { ReactNode } from "react";

/** Carte d'un onglet des paramètres : un titre, puis des réglages séparés par un trait. */
export function ParameterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      <div className="divide-y *:py-5 *:first:pt-0 *:last:pb-0">{children}</div>
    </section>
  );
}

export function ParameterItem({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}
