"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Person, personToString } from "@/models/person";
import { formatPhoneNumber } from "@/components/utils";
import { matchPhones, parseVCards, VCardContact } from "@/lib/vcard";
import { fetchPersonsForPhones, savePersonPhone } from "@/lib/person-phone-api";

const plural = (count: number, word: string) =>
  `${count} ${word}${count > 1 ? "s" : ""}`;

const byLastName = (a: Person, b: Person) =>
  `${a.lastName} ${a.firstName}`.localeCompare(
    `${b.lastName} ${b.firstName}`,
    "fr"
  );

/**
 * Complète les numéros des personnes déjà enregistrées à partir des contacts du téléphone (.vcf).
 * Aucune personne n'est créée ; remplacer un numéro existant reste un choix explicite.
 */
export function ContactsPhoneSection({
  showTitle = true,
}: {
  showTitle?: boolean;
}) {
  const [persons, setPersons] = useState<Person[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<VCardContact[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const updating = progress !== null;

  useEffect(() => {
    let cancelled = false;
    fetchPersonsForPhones()
      .then((list) => {
        if (!cancelled) setPersons(list);
      })
      .catch((e: Error) => {
        if (!cancelled) setLoadError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Recalculé après chaque mise à jour : une personne complétée passe dans « déjà à jour »
  const matching = useMemo(
    () => (persons && contacts ? matchPhones(persons, contacts) : null),
    [persons, contacts]
  );
  const proposals = useMemo(
    () =>
      [...(matching?.proposals ?? [])].sort((a, b) =>
        byLastName(a.person, b.person)
      ),
    [matching]
  );
  const selectedProposals = proposals.filter((p) => selected.has(p.person.id!));

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    setContacts(null);
    setFileError(null);
    setFailed(new Set());
    if (!file || !persons) return;

    const parsed = parseVCards(await file.text());
    if (parsed.length === 0) {
      setFileError(
        "Aucun contact trouvé : choisissez un fichier .vcf exporté depuis l'app Contacts."
      );
      return;
    }
    setContacts(parsed);
    // Cochés d'office : les personnes sans numéro, sans doute possible sur le contact
    setSelected(
      new Set(
        matchPhones(persons, parsed)
          .proposals.filter(
            (p) => !p.person.phoneNumber?.trim() && !p.ambiguous
          )
          .map((p) => p.person.id!)
      )
    );
  };

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const handleUpdate = async () => {
    const toUpdate = selectedProposals;
    const failures = new Set<string>();
    setProgress({ done: 0, total: toUpdate.length });
    for (const [index, proposal] of toUpdate.entries()) {
      try {
        const saved = await savePersonPhone(
          proposal.person,
          proposal.phoneNumber
        );
        setPersons((prev) => prev!.map((p) => (p.id === saved.id ? saved : p)));
      } catch (error) {
        console.error(error);
        failures.add(proposal.person.id!);
      }
      setProgress({ done: index + 1, total: toUpdate.length });
    }
    setProgress(null);
    setFailed(failures);

    const updated = toUpdate.length - failures.size;
    if (updated > 0) {
      toast.success(`${plural(updated, "numéro")} mis à jour !`);
    }
    if (failures.size > 0) {
      toast.error(
        `Échec de la mise à jour de ${plural(failures.size, "numéro")}. Veuillez réessayer.`
      );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {showTitle && (
        <h2 className="text-lg font-semibold">Numéros de téléphone</h2>
      )}
      <p className="text-sm text-muted-foreground">
        Complète les numéros des personnes déjà enregistrées à partir des
        contacts du téléphone, en les reconnaissant par leur nom. Aucune
        personne n&#39;est créée. Sur iPhone : app Contacts, Listes, appui long
        sur une liste, Exporter, puis Enregistrer dans Fichiers.
      </p>
      <Input
        type="file"
        accept=".vcf,text/vcard,text/x-vcard"
        aria-label="Fichier de contacts (.vcf)"
        onChange={handleFileChange}
        disabled={!persons || updating}
      />
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {fileError && <p className="text-sm text-destructive">{fileError}</p>}

      {matching && (
        <>
          <p className="text-sm">
            {plural(proposals.length, "numéro")} à reporter ·{" "}
            {matching.upToDate} déjà à jour ·{" "}
            {plural(matching.unmatchedContacts, "contact")} sans correspondance
          </p>

          {proposals.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {selectedProposals.length} sur {proposals.length} sélectionné
                  {selectedProposals.length > 1 ? "s" : ""}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updating}
                    onClick={() =>
                      setSelected(new Set(proposals.map((p) => p.person.id!)))
                    }
                  >
                    Tout cocher
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updating}
                    onClick={() => setSelected(new Set())}
                  >
                    Tout décocher
                  </Button>
                </div>
              </div>

              <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-md border">
                {proposals.map(
                  ({ person, phoneNumber, ambiguous, reformat }) => {
                    const id = person.id!;
                    return (
                      <li key={id} className="flex items-start gap-3 p-3">
                        <Checkbox
                          id={`phone-${id}`}
                          className="mt-0.5"
                          checked={selected.has(id)}
                          disabled={updating}
                          onCheckedChange={(checked) =>
                            toggle(id, checked === true)
                          }
                        />
                        <label
                          htmlFor={`phone-${id}`}
                          className="min-w-0 flex-1 text-sm"
                        >
                          <span className="font-medium">
                            {personToString(person)}
                          </span>
                          <span className="block text-muted-foreground">
                            {person.phoneNumber
                              ? `${formatPhoneNumber(person.phoneNumber)} → ${formatPhoneNumber(phoneNumber)}`
                              : `Ajout : ${formatPhoneNumber(phoneNumber)}`}
                          </span>
                          {person.phoneNumber && (
                            <span className="block text-xs text-amber-600">
                              {reformat
                                ? "Mise au format international (même numéro)"
                                : "Remplace le numéro actuel"}
                            </span>
                          )}
                          {ambiguous && (
                            <span className="block text-xs text-amber-600">
                              Plusieurs numéros ou homonymes : à vérifier
                            </span>
                          )}
                          {failed.has(id) && (
                            <span className="block text-xs text-destructive">
                              Échec de la mise à jour
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  }
                )}
              </ul>

              <Button
                onClick={handleUpdate}
                disabled={selectedProposals.length === 0 || updating}
              >
                {progress
                  ? `Mise à jour en cours… ${progress.done}/${progress.total}`
                  : `Mettre à jour ${plural(selectedProposals.length, "numéro")}`}
              </Button>
            </>
          )}

          {matching.stillMissing.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Toujours sans numéro ({matching.stillMissing.length}) :{" "}
              {[...matching.stillMissing]
                .sort(byLastName)
                .map(personToString)
                .join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
