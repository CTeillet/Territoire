"use client";

import { ReactNode, useState } from "react";
import { Download, Printer, Share, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Assignment } from "@/models/assignment";
import { isIOSDevice } from "@/lib/device";
import { canShareFile, downloadFile, shareFile } from "@/lib/file-share";
import {
  assignmentLabelFile,
  assignmentLabelText,
  autoPrintAssignmentLabel,
  LabelFile,
  LabelText,
  printAssignmentLabel,
} from "@/lib/assignment-label";
import { isAutoPrintEnabled } from "@/lib/label-printer";
import {
  isNativeLabelPrintingEnabled,
  nativeAssignmentLabelURL,
} from "@/lib/iphone-label-printer";
import { isNativeApp } from "@/lib/native-app";

/** Mode d'emploi du fichier LBX sur iPhone : l'application Brother imprime, TMS ne fait que préparer le fichier. */
export const LBX_HELP =
  "Ouvrez le fichier téléchargé (au besoin depuis l'app Fichiers, dossier Téléchargements), choisissez Design&Print 2 dans les options de partage, puis touchez « Imprimer ».";

type LabelAssignment = Pick<Assignment, "id" | "person" | "dueDate">;

/** Carte d'une étiquette, affichée jusqu'à sa fermeture : à qui et pour quand, puis ce que propose le parcours. */
function LabelCard({
  title,
  text,
  onClose,
  children,
}: {
  title: string;
  text: LabelText;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="w-full rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm">
            {text.name} · {text.dueDate}
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
      {children}
    </div>
  );
}

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
    <LabelCard title="Étiquette prête" text={label.text} onClose={onClose}>
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
    </LabelCard>
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

/** Un vrai lien touché par l'utilisateur : pas de lancement après un appel réseau asynchrone. */
export function offerNativeAssignmentLabel(assignment: LabelAssignment): void {
  try {
    const text = assignmentLabelText(assignment);
    if (!text) return;
    const url = nativeAssignmentLabelURL(assignment);
    if (!url) return;
    toast.custom(
      (id) => (
        <LabelCard
          title="Étiquette prête à imprimer"
          text={text}
          onClose={() => toast.dismiss(id)}
        >
          <p className="mt-2 text-xs text-muted-foreground">
            Ouvre TMS Impression sur cet iPhone. L&apos;app indique le résultat
            de l&apos;impression.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <a href={url}>
                <Printer />
                Imprimer
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => offerAssignmentLabelFile(assignment)}
            >
              <Download />
              Utiliser le fichier LBX
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Si l&apos;app ne s&apos;ouvre pas, vérifiez son installation et sa
            signature, ou utilisez le fichier LBX.
          </p>
        </LabelCard>
      ),
      { id: `etiquette-${assignment.id}`, duration: Infinity }
    );
  } catch (error) {
    console.error("❌ Lien d'impression non généré :", error);
    toast.error(
      "L'ouverture de TMS Impression a échoué. L'étiquette est proposée en fichier LBX."
    );
    offerAssignmentLabelFile(assignment);
  }
}

/** Dans l'app iOS TMS, sans impression automatique : l'étiquette part au toucher de « Imprimer ». */
function offerAppAssignmentLabel(assignment: LabelAssignment): void {
  const text = assignmentLabelText(assignment);
  if (!text) return;
  toast.custom(
    (id) => (
      <LabelCard
        title="Étiquette prête à imprimer"
        text={text}
        onClose={() => toast.dismiss(id)}
      >
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              toast.dismiss(id);
              void printAssignmentLabel(assignment);
            }}
          >
            <Printer />
            Imprimer
          </Button>
        </div>
      </LabelCard>
    ),
    { id: `etiquette-${assignment.id}`, duration: Infinity }
  );
}

/**
 * Après une attribution réussie. Dans l'app iOS TMS, l'étiquette s'imprime si l'impression automatique est
 * activée, sinon une carte la propose. Dans Safari sur iOS, lien vers l'app native si elle est choisie, sinon le
 * LBX. Ailleurs, l'étiquette s'imprime si l'appareil est réglé pour (Web Serial). Ne rejette jamais : un problème
 * d'étiquette ne remet pas en cause l'attribution enregistrée.
 */
export async function labelAfterAssignment(
  assignment: LabelAssignment | null | undefined
): Promise<void> {
  if (!assignment) return;
  if (isNativeApp()) {
    if (isAutoPrintEnabled()) await printAssignmentLabel(assignment);
    else offerAppAssignmentLabel(assignment);
    return;
  }
  if (isIOSDevice()) {
    if (isNativeLabelPrintingEnabled()) offerNativeAssignmentLabel(assignment);
    else offerAssignmentLabelFile(assignment);
    return;
  }
  try {
    await autoPrintAssignmentLabel(assignment);
  } catch (error) {
    // Web Serial refusé (politique de permissions) : comme sans imprimante
    console.error("❌ Étiquette non imprimée :", error);
  }
}
