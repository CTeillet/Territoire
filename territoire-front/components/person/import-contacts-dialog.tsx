"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Person, personToString } from "@/models/person";
import { formatPhoneNumber } from "@/components/utils";
import {
  findExistingPerson,
  parseVCards,
  sameName,
  VCardContact,
} from "@/lib/vcard";
import { toast } from "sonner";
import { Contact } from "lucide-react";

type ImportContactsDialogProps = {
  persons: Person[];
  /** Faux tant que la liste des personnes n'est pas chargée : tout contact passerait pour nouveau. */
  personsLoaded: boolean;
  onCreate: (person: Person) => Promise<void>;
};

type Row = {
  key: number;
  contact: VCardContact;
  /** Raison de ne pas cocher le contact d'office (doublon, nom incomplet). */
  warning?: string;
  importable: boolean;
  status?: "imported" | "failed";
};

const plural = (count: number, word: string) =>
  `${count} ${word}${count > 1 ? "s" : ""}`;

function toRows(contacts: VCardContact[], persons: Person[]): Row[] {
  return contacts.map((contact, key) => {
    const importable = !!contact.firstName && !!contact.lastName;
    const existing = findExistingPerson(contact, persons);
    const warning = !importable
      ? "Prénom ou nom manquant : à compléter dans le téléphone"
      : existing
        ? `Déjà dans l'application (${personToString(existing)})`
        : contacts.slice(0, key).some((other) => sameName(other, contact))
          ? "En double dans le fichier"
          : undefined;
    return { key, contact, warning, importable };
  });
}

const ImportContactsDialog: React.FC<ImportContactsDialogProps> = ({
  persons,
  personsLoaded,
  onCreate,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const importing = progress !== null;

  const reset = () => {
    setRows(null);
    setSelected(new Set());
    setFileError(null);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    reset();
    if (!file) return;

    const contacts = parseVCards(await file.text());
    if (contacts.length === 0) {
      setFileError(
        "Aucun contact trouvé : choisissez un fichier .vcf exporté depuis l'app Contacts."
      );
      return;
    }
    const newRows = toRows(contacts, persons);
    setRows(newRows);
    setSelected(
      new Set(
        newRows.filter((r) => r.importable && !r.warning).map((r) => r.key)
      )
    );
  };

  const toggle = (key: number, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });

  const selectable = (rows ?? []).filter(
    (r) => r.importable && r.status !== "imported"
  );

  const handleImport = async () => {
    const toImport = selectable.filter((r) => selected.has(r.key));
    let failures = 0;
    setProgress({ done: 0, total: toImport.length });
    for (const [index, row] of toImport.entries()) {
      const { firstName, lastName, email, phoneNumber } = row.contact;
      let status: Row["status"] = "imported";
      try {
        await onCreate({ id: null, firstName, lastName, email, phoneNumber });
        toggle(row.key, false);
      } catch (error) {
        console.error(error);
        status = "failed";
        failures++;
      }
      setRows((prev) =>
        prev!.map((r) => (r.key === row.key ? { ...r, status } : r))
      );
      setProgress({ done: index + 1, total: toImport.length });
    }
    setProgress(null);

    const imported = toImport.length - failures;
    if (imported > 0) {
      toast.success(
        `${plural(imported, "personne")} importée${imported > 1 ? "s" : ""} !`
      );
    }
    if (failures > 0) {
      // Le dialogue reste ouvert, les contacts en échec toujours cochés
      toast.error(
        `Échec de l'import de ${plural(failures, "contact")}. Veuillez réessayer.`
      );
    } else {
      setDialogOpen(false);
      reset();
    }
  };

  const selectedCount = selectable.filter((r) => selected.has(r.key)).length;

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (importing) return;
        setDialogOpen(open);
        if (!open) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="mt-4"
          disabled={!personsLoaded}
        >
          <Contact className="w-4 h-4" />
          Importer des contacts
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col">
        <DialogHeader>
          <DialogTitle>Importer des contacts</DialogTitle>
          <DialogDescription>
            Choisissez un fichier .vcf exporté depuis l&#39;app Contacts : sur
            iPhone, touchez Listes, maintenez le doigt sur une liste, puis
            Exporter.
          </DialogDescription>
        </DialogHeader>

        <Input
          type="file"
          accept=".vcf,text/vcard,text/x-vcard"
          aria-label="Fichier de contacts (.vcf)"
          onChange={handleFileChange}
          disabled={importing}
        />
        {fileError && <p className="text-sm text-destructive">{fileError}</p>}

        {rows && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {selectedCount} sur {plural(rows.length, "contact")} sélectionné
                {selectedCount > 1 ? "s" : ""}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={importing}
                  onClick={() =>
                    setSelected(new Set(selectable.map((r) => r.key)))
                  }
                >
                  Tout cocher
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={importing}
                  onClick={() => setSelected(new Set())}
                >
                  Tout décocher
                </Button>
              </div>
            </div>

            <ul className="min-h-0 flex-1 divide-y overflow-y-auto rounded-md border">
              {rows.map((row) => {
                const { contact } = row;
                const name =
                  `${contact.firstName} ${contact.lastName}`.trim() ||
                  "Sans nom";
                const note =
                  row.status === "imported"
                    ? "Importée"
                    : row.status === "failed"
                      ? "Échec de l'import"
                      : row.warning;
                return (
                  <li key={row.key} className="flex items-start gap-3 p-3">
                    <Checkbox
                      id={`contact-${row.key}`}
                      className="mt-0.5"
                      checked={selected.has(row.key)}
                      disabled={
                        !row.importable ||
                        row.status === "imported" ||
                        importing
                      }
                      onCheckedChange={(checked) =>
                        toggle(row.key, checked === true)
                      }
                    />
                    <label
                      htmlFor={`contact-${row.key}`}
                      className="min-w-0 flex-1 text-sm"
                    >
                      <span className="font-medium">{name}</span>
                      <span className="block truncate text-muted-foreground">
                        {[
                          contact.phoneNumber &&
                            formatPhoneNumber(contact.phoneNumber),
                          contact.email,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {contact.invalidPhone && (
                        <span className="block text-xs text-amber-600">
                          Numéro non reconnu, non importé :{" "}
                          {contact.invalidPhone}
                        </span>
                      )}
                      {note && (
                        <span
                          className={
                            row.status === "imported"
                              ? "block text-xs text-green-600"
                              : "block text-xs text-amber-600"
                          }
                        >
                          {note}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <DialogFooter>
          <Button
            onClick={handleImport}
            disabled={selectedCount === 0 || importing}
          >
            {progress
              ? `Import en cours… ${progress.done}/${progress.total}`
              : `Importer ${plural(selectedCount, "personne")}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportContactsDialog;
