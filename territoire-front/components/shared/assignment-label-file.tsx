"use client";

import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Assignment } from "@/models/assignment";
import { isIOSDevice } from "@/lib/device";
import { canShareFile, downloadFile, shareFile } from "@/lib/file-share";
import {
  assignmentLabelFile,
  autoPrintAssignmentLabel,
  LabelFile,
} from "@/lib/assignment-label";

/** Mode d'emploi du fichier LBX sur iPhone : l'application Brother imprime, TMS ne fait que préparer le fichier. */
export const LBX_HELP =
  "Ouvrez le fichier téléchargé (au besoin depuis l'app Fichiers, dossier Téléchargements), choisissez Design&Print 2 dans les options de partage, puis touchez « Imprimer ».";

type LabelAssignment = Pick<Assignment, "id" | "person" | "dueDate">;

/** Étiquette prête : téléchargement du fichier, partage si le navigateur l'accepte, et mode d'emploi. */
export function LabelFileCard({
  label,
  onClose,
}: {
  label: LabelFile;
  onClose: () => void;
}) {
  // La carte n'est affichée que dans le navigateur (notification) : navigator est disponible
  const [shareable] = useState(() => canShareFile(label.file));

  const onShare = async () => {
    try {
      await shareFile(label.file);
    } catch {
      toast.error(
        "Le navigateur refuse de partager ce fichier : utilisez « Télécharger »."
      );
    }
  };

  return (
    <div className="w-full rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Étiquette prête</p>
          <p className="text-sm">
            {label.text.name} · {label.text.dueDate}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Fermer"
        >
          <X />
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {LBX_HELP}
        {shareable && " « Partager » ouvre directement les options de partage."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => downloadFile(label.file)}>
          <Download />
          Télécharger
        </Button>
        {shareable && (
          <Button size="sm" variant="outline" onClick={onShare}>
            <Share />
            Partager
          </Button>
        )}
      </div>
    </div>
  );
}

function generate(assignment: LabelAssignment): LabelFile | null {
  try {
    return assignmentLabelFile(assignment);
  } catch (error) {
    console.error("❌ Fichier de l'étiquette non généré :", error);
    toast.error("Le fichier de l'étiquette n'a pas pu être généré.");
    return null;
  }
}

/**
 * Prépare le fichier LBX de l'étiquette et le propose dans une carte qui reste affichée, même après la fermeture
 * du dialogue d'attribution, jusqu'à ce qu'on la ferme : Safari ne télécharge ou ne partage qu'au toucher d'un
 * bouton. Rien pour une attribution sans personne ; ne lève jamais d'erreur.
 */
export function offerAssignmentLabelFile(assignment: LabelAssignment): void {
  const label = generate(assignment);
  if (!label) return;
  toast.custom(
    (id) => <LabelFileCard label={label} onClose={() => toast.dismiss(id)} />,
    // Une carte par attribution : la redemander la remplace
    { id: `etiquette-${assignment.id}`, duration: Infinity }
  );
}

/**
 * Après une attribution réussie, avec l'attribution renvoyée par le backend : sur iPhone et iPad, le fichier LBX
 * est proposé ; ailleurs, l'étiquette s'imprime si l'appareil est réglé pour (Web Serial). Ne rejette jamais :
 * un problème d'étiquette ne remet pas en cause l'attribution enregistrée.
 */
export async function labelAfterAssignment(
  assignment: LabelAssignment | null | undefined
): Promise<void> {
  if (!assignment) return;
  if (isIOSDevice()) {
    offerAssignmentLabelFile(assignment);
    return;
  }
  try {
    await autoPrintAssignmentLabel(assignment);
  } catch (error) {
    // Web Serial refusé (politique de permissions) : comme sans imprimante
    console.error("❌ Étiquette non imprimée :", error);
  }
}
