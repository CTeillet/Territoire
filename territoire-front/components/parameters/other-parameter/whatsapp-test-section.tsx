"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Send } from "lucide-react";
import { toast } from "sonner";
import { Person, personToString } from "@/models/person";
import { WhatsAppTestResult } from "@/models/whatsapp-test";
import { fetchPersonsForWhatsApp, sendWhatsAppTest } from "@/lib/whatsapp-api";

export const DEFAULT_TEST_MESSAGE =
  "Message de test envoyé depuis Territoire : l'envoi WhatsApp fonctionne.";

/** Envoi d'un message de test à une personne pour vérifier la liaison avec WAHA (réservé à l'administrateur). */
export function WhatsAppTestSection({
  showTitle = true,
}: {
  showTitle?: boolean;
}) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [personId, setPersonId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_TEST_MESSAGE);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<WhatsAppTestResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPersonsForWhatsApp()
      .then((list) => {
        if (cancelled) return;
        // Seules les personnes ayant un numéro peuvent recevoir un message
        setPersons(
          list
            .filter((p) => p.phoneNumber?.trim())
            .sort((a, b) =>
              personToString(a).localeCompare(personToString(b), "fr")
            )
        );
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = persons.find((p) => p.id === personId);

  const onSend = async () => {
    if (!personId) return;
    setSending(true);
    setResult(null);
    try {
      const res = await sendWhatsAppTest(personId, message.trim());
      setResult(res);
      if (res.sent) {
        toast.success(`Message de test envoyé à ${res.recipient}`);
      } else {
        toast.error("WAHA a refusé l'envoi");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {showTitle && <h2 className="text-lg font-semibold">Test WhatsApp</h2>}
      <p className="text-sm text-muted-foreground">
        Envoie un message via WAHA pour vérifier la configuration (serveur,
        session, clé API).
      </p>

      <div className="flex flex-col gap-2">
        <Label>Destinataire</Label>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-label="Destinataire"
              aria-expanded={pickerOpen}
              className="w-full max-w-md justify-between"
            >
              {selected
                ? `${personToString(selected)} (${selected.phoneNumber})`
                : "Choisir une personne"}
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
            <Command>
              <CommandInput placeholder="Rechercher une personne..." />
              <CommandList>
                <CommandEmpty>Aucune personne avec un numéro.</CommandEmpty>
                <CommandGroup>
                  {persons.map((person) => (
                    <CommandItem
                      key={person.id}
                      value={`${personToString(person)} ${person.phoneNumber}`}
                      onSelect={() => {
                        setPersonId(person.id);
                        setResult(null);
                        setPickerOpen(false);
                      }}
                    >
                      {personToString(person)}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {person.phoneNumber}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="whatsapp-test-message">Message</Label>
        <Textarea
          id="whatsapp-test-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={1000}
        />
      </div>

      <div>
        <Button
          onClick={onSend}
          disabled={!personId || message.trim().length === 0 || sending}
          className="inline-flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {sending ? "Envoi..." : "Envoyer le test"}
        </Button>
      </div>

      {result && (
        <p
          role="status"
          className={
            result.sent ? "text-sm text-green-700" : "text-sm text-destructive"
          }
        >
          {result.sent
            ? `Envoyé à ${result.recipient} (${result.phoneNumber}).`
            : `Échec de l'envoi à ${result.recipient} (${result.phoneNumber}) : ${result.error}`}
        </p>
      )}
    </div>
  );
}
