import Link from "next/link";
import { textLink } from "@/components/shared/tones";

// Le nom mène au détail du territoire : plus besoin d'un bouton dédié dans les actions
export function TerritoryNameLink({ id, name }: { id: string; name: string }) {
  return (
    <Link href={`/territoires/${id}`} className={textLink}>
      {name}
    </Link>
  );
}
