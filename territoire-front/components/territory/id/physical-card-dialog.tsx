"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  Loader2,
  MapIcon,
  RotateCw,
  Save,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authFetch } from "@/utils/auth-fetch";
import { apiErrorMessage } from "@/utils/api-error";
import { downloadFile, safeFileName } from "@/lib/file-share";
import {
  DEFAULT_PLAN_THEMES,
  PLAN_ERROR,
  PLAN_THEMES,
  PlanTheme,
  renderIgnPlan,
} from "@/lib/ign-plan";
import {
  CARD_FRAMING_LABELS,
  CARD_FRAMINGS,
  CardFraming,
} from "@/models/card-framing";
import { CardMapLayout } from "@/models/card-map-layout";
import { useAppDispatch } from "@/store/store";
import { saveTerritoryCard } from "@/store/slices/territory-slice";

const PREVIEW_ERROR = "La carte n'a pas pu être générée. Réessayez plus tard.";

type Preview =
  | { status: "loading" }
  | { status: "ready"; url: string; card: Blob; plan: Blob }
  | { status: "error"; message: string };

interface PhysicalCardDialogProps {
  territoryId: string;
  territoryName: string;
  /** Le territoire a déjà une carte (importée ou générée) : l'enregistrement la remplace. */
  hasCard: boolean;
  /** Carte enregistrée : l'image affichée sur la fiche est à recharger. */
  onSaved?: () => void;
}

/**
 * Carte physique d'un territoire : le formulaire « Carte de territoire » rempli (lieu, numéro) avec le plan du
 * quartier, où le territoire ressort en vert cerné de vert foncé (lisible aussi imprimé en noir et blanc). Le plan est
 * dessiné ici depuis les tuiles vectorielles IGN, avec les thèmes choisis (maisons, végétation…), puis le back compose
 * la carte. Aperçu à télécharger ou à garder comme carte du territoire, pour l'imprimer depuis « Impression des
 * cartes ».
 */
export function PhysicalCardDialog({
  territoryId,
  territoryName,
  hasCard,
  onSaved,
}: PhysicalCardDialogProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [framing, setFraming] = useState<CardFraming>("NORMAL");
  const [themes, setThemes] = useState<PlanTheme[]>(DEFAULT_PLAN_THEMES);
  const [saving, setSaving] = useState(false);
  // Une ouverture de la fenêtre = un nouvel aperçu : l'image d'une ouverture précédente a été libérée
  const [session, setSession] = useState(0);
  const requestKey = `${session}:${framing}:${themes.join(",")}`;
  const [result, setResult] = useState<{
    key: string;
    preview: Preview;
  } | null>(null);
  const preview: Preview =
    result?.key === requestKey ? result.preview : { status: "loading" };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let url: string | null = null;
    const show = (next: Preview) => {
      if (!cancelled) setResult({ key: requestKey, preview: next });
    };
    const fail = async (response: Response) =>
      show({
        status: "error",
        message: await apiErrorMessage(response, PREVIEW_ERROR),
      });

    (async () => {
      try {
        const layoutResponse = await authFetch(
          `/api/territoires/${territoryId}/carte-physique/emprise?cadrage=${framing}`
        );
        if (!layoutResponse.ok) return fail(layoutResponse);
        const layout: CardMapLayout = await layoutResponse.json();

        let plan: Blob;
        try {
          plan = await renderIgnPlan(layout, themes);
        } catch (error) {
          // Tuile manquante, IGN injoignable ou WebGL absent : la cause reste lisible dans la console
          console.error("Plan IGN non dessiné", error, (error as Error)?.cause);
          show({ status: "error", message: PLAN_ERROR });
          return;
        }
        if (cancelled) return;

        const body = new FormData();
        body.append("plan", plan, "plan.png");
        const response = await authFetch(
          `/api/territoires/${territoryId}/carte-physique/apercu?cadrage=${framing}`,
          { method: "POST", body }
        );
        if (!response.ok) return fail(response);
        const card = await response.blob();
        if (cancelled) return;
        url = URL.createObjectURL(card);
        show({ status: "ready", url, card, plan });
      } catch {
        show({ status: "error", message: PREVIEW_ERROR });
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, framing, themes, territoryId, requestKey]);

  const handleOpenChange = (next: boolean) => {
    if (next) setSession((value) => value + 1);
    setOpen(next);
  };

  // Ordre des thèmes gardé : la clé de l'aperçu ne change pas pour un même choix
  const toggleTheme = (theme: PlanTheme, shown: boolean) =>
    setThemes((current) =>
      PLAN_THEMES.map((t) => t.id).filter((id) =>
        id === theme ? shown : current.includes(id)
      )
    );

  const handleDownload = () => {
    if (preview.status !== "ready") return;
    downloadFile(
      new File([preview.card], safeFileName(`carte-${territoryName}`, "png"), {
        type: "image/png",
      })
    );
  };

  // Le back compose la carte avec le plan de l'aperçu : c'est celle qu'on voit
  const handleSave = async () => {
    if (preview.status !== "ready") return;
    setSaving(true);
    try {
      await dispatch(
        saveTerritoryCard({ territoryId, framing, plan: preview.plan })
      ).unwrap();
      toast.success(
        "Carte enregistrée : elle s'imprime depuis « Impression des cartes »."
      );
      setOpen(false);
      onSaved?.();
    } catch (error) {
      toast.error(String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MapIcon aria-hidden="true" />
          Générer la carte
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Carte physique</DialogTitle>
          <DialogDescription>
            La carte de territoire à imprimer, en couleur ou en noir et blanc :
            la ville, le numéro du territoire et le plan du quartier, où les
            pâtés à travailler ressortent en vert.
          </DialogDescription>
        </DialogHeader>

        <div
          role="group"
          aria-label="Cadrage du plan"
          className="flex flex-wrap items-center gap-2"
        >
          <span className="text-sm font-medium">Cadrage :</span>
          {CARD_FRAMINGS.map((value) => (
            <Button
              key={value}
              variant={framing === value ? "default" : "outline"}
              size="sm"
              aria-pressed={framing === value}
              onClick={() => setFraming(value)}
            >
              {CARD_FRAMING_LABELS[value]}
            </Button>
          ))}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Sur le plan, en plus des rues :
          </legend>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
            {PLAN_THEMES.map((theme) => (
              <label key={theme.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={themes.includes(theme.id)}
                  onCheckedChange={(checked) =>
                    toggleTheme(theme.id, checked === true)
                  }
                />
                {theme.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Mêmes proportions que la carte : la fenêtre ne saute pas quand l'aperçu arrive */}
        <div className="relative aspect-[875/616] w-full overflow-hidden rounded-md border bg-muted/40">
          {preview.status === "ready" && (
            // Image chargée par authFetch puis servie en blob: : rien à optimiser pour next/image
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.url}
              alt={`Carte physique du territoire ${territoryName}`}
              className="h-full w-full object-contain"
            />
          )}
          {preview.status === "loading" && (
            <p
              role="status"
              className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              Génération de la carte…
            </p>
          )}
          {preview.status === "error" && (
            <div
              role="alert"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm"
            >
              <TriangleAlert
                aria-hidden="true"
                className="h-6 w-6 text-destructive"
              />
              <p>{preview.message}</p>
              {/* Nouvelle génération : le plan IGN répond d'ordinaire au deuxième essai */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSession((value) => value + 1)}
              >
                <RotateCw aria-hidden="true" />
                Réessayer
              </Button>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {hasCard
            ? "L'enregistrer remplace la carte actuelle du territoire, celle qu'imprime la page « Impression des cartes »."
            : "Une fois enregistrée, la carte s'imprime depuis la page « Impression des cartes »."}
        </p>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={preview.status !== "ready"}
          >
            <Download aria-hidden="true" />
            Télécharger
          </Button>
          <Button
            onClick={handleSave}
            disabled={preview.status !== "ready" || saving}
          >
            {saving ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {saving
              ? "Enregistrement…"
              : hasCard
                ? "Remplacer la carte"
                : "Enregistrer la carte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
