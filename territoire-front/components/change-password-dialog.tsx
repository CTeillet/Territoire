"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/utils/auth-fetch";
import { PASSWORD_MIN_LENGTH } from "@/utils/password";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé après un changement réussi : la session est révoquée, il faut se reconnecter. */
  onChanged: () => void;
};

export default function ChangePasswordDialog({
  open,
  onOpenChange,
  onChanged,
}: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const error =
    next.length > 0 && next.length < PASSWORD_MIN_LENGTH
      ? `Au moins ${PASSWORD_MIN_LENGTH} caractères`
      : confirm.length > 0 && confirm !== next
        ? "Les mots de passe ne correspondent pas"
        : null;
  const canSubmit =
    !saving &&
    current.length > 0 &&
    next.length >= PASSWORD_MIN_LENGTH &&
    next === confirm;

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/authentification/mot-de-passe", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.ok) {
        toast.success("Mot de passe modifié, veuillez vous reconnecter");
        reset();
        onOpenChange(false);
        onChanged();
        return;
      }
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Impossible de modifier le mot de passe");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Changer mon mot de passe</AlertDialogTitle>
          <AlertDialogDescription>
            Vous serez déconnecté de tous vos appareils.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-password">Confirmation</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
            <Button type="submit" disabled={!canSubmit}>
              Modifier
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
