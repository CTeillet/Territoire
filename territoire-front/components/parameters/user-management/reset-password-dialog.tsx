"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, KeyRound, RefreshCcw } from "lucide-react";
import { generatePassword } from "@/utils/password";
import { useState } from "react";
import { toast } from "sonner";

type ResetPasswordDialogProps = {
  username: string;
  userId: string;
  /** Résout à true si le serveur a accepté le nouveau mot de passe. */
  onReset: (id: string, password: string) => Promise<boolean>;
};

const ResetPasswordDialog = ({
  username,
  userId,
  onReset,
}: ResetPasswordDialogProps) => {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Un mot de passe neuf à chaque ouverture : rien ne traîne d'une réinitialisation à l'autre
  const handleOpenChange = (next: boolean) => {
    if (next) setPassword(generatePassword());
    setOpen(next);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Mot de passe copié");
    } catch {
      toast.error("Impossible de copier le mot de passe");
    }
  };

  // En cas d'échec la modale reste ouverte : le mot de passe affiché n'a pas été appliqué
  const handleSubmit = async () => {
    setSubmitting(true);
    const ok = await onReset(userId, password);
    setSubmitting(false);
    if (ok) setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="p-2"
          aria-label={`Réinitialiser le mot de passe de ${username}`}
        >
          <KeyRound size={18} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Réinitialiser le mot de passe</AlertDialogTitle>
          <AlertDialogDescription>
            Un nouveau mot de passe va être attribué à <b>{username}</b>.
            Notez-le avant de valider pour le lui transmettre : ses sessions en
            cours seront déconnectées.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`reset-password-${userId}`}>
            Nouveau mot de passe
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`reset-password-${userId}`}
              value={password}
              readOnly
              className="font-mono"
            />
            <Button
              type="button"
              variant="outline"
              onClick={copy}
              aria-label="Copier le mot de passe"
            >
              <Copy />
            </Button>
            <Button
              type="button"
              onClick={() => setPassword(generatePassword())}
              aria-label="Générer un nouveau mot de passe"
            >
              <RefreshCcw />
            </Button>
          </div>
        </div>
        <AlertDialogFooter className="flex justify-end gap-2">
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Réinitialisation..." : "Réinitialiser"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ResetPasswordDialog;
