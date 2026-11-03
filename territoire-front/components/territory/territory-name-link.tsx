import Link from "next/link";

// Le nom mène au détail du territoire : plus besoin d'un bouton dédié dans les actions
export function TerritoryNameLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      href={`/territoires/${id}`}
      className="font-medium text-blue-700 underline-offset-4 hover:underline"
    >
      {name}
    </Link>
  );
}
