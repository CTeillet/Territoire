"use client";

import { AddressNotToDo } from "@/models/addressNotToDo";
import { AddressNotToDoDto } from "@/models/AddressNotToDoDto";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pencil, Trash, Check, Plus, MapPin } from "lucide-react";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  addAddressNotToVisit,
  deleteAddressNotToVisit,
  modifyAddressNotToVisit,
} from "@/store/slices/territory-slice";
import { parseAddress, sameAddress } from "@/lib/address-input";
import {
  ADDRESS_MIN_LENGTH,
  AddressResult,
  searchAddresses,
} from "@/lib/address-search";

const DEBOUNCE_MS = 300;

type Suggestion = { label: string; address: AddressNotToDoDto };

/** Seules les adresses avec un numéro sont proposées : une rue entière n'est pas une adresse à éviter. */
const toSuggestion = ({
  housenumber,
  street,
  postcode,
  city,
}: AddressResult): Suggestion[] =>
  housenumber && street && postcode && city
    ? [
        {
          label: `${housenumber} ${street}, ${postcode} ${city}`,
          address: { number: housenumber, street, zipCode: postcode, city },
        },
      ]
    : [];

const AddressNotToDoList = () => {
  const dispatch = useAppDispatch();

  // 📌 Récupération du territoire sélectionné
  const selectedTerritory = useAppSelector(
    (state) => state.territories.selectedTerritory
  );

  const city = selectedTerritory?.city;
  const latitude = city?.center?.latitude;
  const longitude = city?.center?.longitude;
  // Adresses proposées près de la ville du territoire d'abord
  const near = useMemo(
    () =>
      latitude !== undefined && longitude !== undefined
        ? { lat: latitude, lng: longitude }
        : null,
    [latitude, longitude]
  );
  const defaultCity =
    city?.zipCode && city?.name
      ? { zipCode: city.zipCode, name: city.name }
      : null;

  const [query, setQuery] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // Suggestions du service, avec la saisie à laquelle elles répondent
  const [found, setFound] = useState<{
    query: string;
    suggestions: Suggestion[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedAddress, setEditedAddress] = useState<AddressNotToDo | null>(
    null
  );
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const q = query.trim();
  // Suggestions dès qu'un numéro et le début de la rue sont tapés
  const searchable = q.length >= ADDRESS_MIN_LENGTH && /^\d+\D/.test(q);

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchAddresses(q, near, controller.signal)
        .then((results) =>
          setFound({ query: q, suggestions: results.flatMap(toSuggestion) })
        )
        .catch((e: Error) => {
          // Service injoignable : la saisie libre reste possible
          if (e.name !== "AbortError") setFound({ query: q, suggestions: [] });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, searchable, near]);

  const suggestions = searchable && found?.query === q ? found.suggestions : [];

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editedAddress) {
      setEditedAddress({ ...editedAddress, [e.target.name]: e.target.value });
    }
  };

  const addAddress = async (address: AddressNotToDoDto) => {
    if (!selectedTerritory || adding) return;
    if (
      selectedTerritory.addressesNotToDo?.some((existing) =>
        sameAddress(existing, address)
      )
    ) {
      setAddError("Cette adresse est déjà dans la liste");
      return;
    }

    setAdding(true);
    try {
      await dispatch(
        addAddressNotToVisit({
          territoryId: selectedTerritory.id,
          address,
        })
      ).unwrap();
      setQuery("");
      setFound(null);
      setAddError(null);
      inputRef.current?.focus();
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout de l'adresse :", error);
      setAddError("L'adresse n'a pas pu être ajoutée, réessayez");
    } finally {
      setAdding(false);
    }
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseAddress(query, defaultCity);
    if (parsed.error !== undefined) {
      setAddError(parsed.error);
      return;
    }
    void addAddress(parsed.address);
  };

  // Flèches haut et bas : du champ aux suggestions, et d'une suggestion à l'autre
  const moveFocus = (e: React.KeyboardEvent, from: number) => {
    const buttons = Array.from(
      suggestionsRef.current?.querySelectorAll("button") ?? []
    );
    if (e.key === "ArrowDown" && from < buttons.length - 1) {
      e.preventDefault();
      buttons[from + 1].focus();
    } else if (e.key === "ArrowUp" && from >= 0) {
      e.preventDefault();
      (from === 0 ? inputRef.current : buttons[from - 1])?.focus();
    } else if (e.key === "Escape" && from >= 0) {
      inputRef.current?.focus();
    }
  };

  const handleEdit = (index: number) => {
    if (!selectedTerritory) return; // Empêche l'accès à null

    setEditingIndex(index);
    setEditedAddress({ ...selectedTerritory.addressesNotToDo[index] });
  };

  const handleSaveEdit = async () => {
    if (!selectedTerritory || !editedAddress?.id) return;

    try {
      await dispatch(
        modifyAddressNotToVisit({
          territoryId: selectedTerritory.id,
          address: {
            city: editedAddress.city,
            number: editedAddress.number,
            street: editedAddress.street,
            zipCode: editedAddress.zipCode,
          },
          addressId: editedAddress.id,
        })
      ).unwrap();
      setEditingIndex(null);
      setEditedAddress(null);
    } catch (error) {
      console.error("❌ Erreur lors de la modification de l'adresse :", error);
    }
  };

  const handleDeleteClick = (index: number) => {
    setDeleteIndex(index);
  };

  const handleConfirmDelete = async () => {
    if (
      !selectedTerritory ||
      deleteIndex === null ||
      !selectedTerritory.addressesNotToDo[deleteIndex].id
    )
      return;

    setDeleting(true);
    try {
      await dispatch(
        deleteAddressNotToVisit({
          territoryId: selectedTerritory.id,
          addressId: selectedTerritory.addressesNotToDo[deleteIndex].id,
        })
      ).unwrap();
      setDeleteIndex(null);
    } catch (error) {
      console.error("❌ Erreur lors de la suppression de l'adresse :", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <h2 className="mb-4 leading-none font-semibold">
        Adresses à ne pas visiter
      </h2>

      <ul>
        {selectedTerritory?.addressesNotToDo?.map((address, index) => (
          <li
            key={address.id}
            className="p-2 border-b flex justify-between items-center gap-2"
          >
            {editingIndex === index ? (
              <div className="flex flex-wrap gap-2">
                <Input
                  type="text"
                  name="number"
                  value={editedAddress?.number || ""}
                  onChange={handleEditChange}
                  className="w-16"
                />
                <Input
                  type="text"
                  name="street"
                  value={editedAddress?.street || ""}
                  onChange={handleEditChange}
                  className="w-40"
                />
                <Input
                  type="text"
                  name="zipCode"
                  value={editedAddress?.zipCode || ""}
                  onChange={handleEditChange}
                  className="w-20"
                />
                <Input
                  type="text"
                  name="city"
                  value={editedAddress?.city || ""}
                  onChange={handleEditChange}
                  className="w-32"
                />
                <Button
                  size="icon"
                  aria-label="Enregistrer l'adresse"
                  onClick={handleSaveEdit}
                >
                  <Check aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <>
                <span className="min-w-0 break-words">
                  {address.number}, {address.street} - {address.zipCode}{" "}
                  {address.city}
                </span>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Modifier l'adresse"
                    onClick={() => handleEdit(index)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        aria-label="Supprimer l'adresse"
                        variant="destructive-outline"
                        size="icon"
                        disabled={deleting}
                        onClick={() => handleDeleteClick(index)}
                      >
                        <Trash aria-hidden="true" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Confirmer la suppression
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer l&#39;adresse{" "}
                          <b>
                            {address.number} {address.street}
                          </b>{" "}
                          ?<br />
                          Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex justify-end gap-2">
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={handleConfirmDelete}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <form className="mt-4" onSubmit={handleAddAddress} noValidate>
        <label htmlFor={inputId} className="mb-2 block font-semibold">
          Ajouter une adresse
        </label>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id={inputId}
            type="text"
            name="address"
            autoComplete="off"
            placeholder="21 rue de la Paix"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setAddError(null);
            }}
            onKeyDown={(e) => moveFocus(e, -1)}
            aria-invalid={addError ? true : undefined}
            aria-describedby={addError ? `${errorId} ${hintId}` : hintId}
            className="min-w-0 flex-1"
          />
          <Button
            type="submit"
            aria-label="Ajouter l'adresse"
            disabled={adding}
          >
            <Plus aria-hidden="true" />
            Ajouter
          </Button>
        </div>
        {addError && (
          <p
            id={errorId}
            role="alert"
            className="mt-2 text-sm text-destructive"
          >
            {addError}
          </p>
        )}
        <p id={hintId} className="mt-2 text-sm text-muted-foreground">
          {defaultCity
            ? `Ville du territoire par défaut : ${defaultCity.zipCode} ${defaultCity.name}`
            : "Précisez le code postal et la ville, ex. 21 rue de la Paix, 35000 Rennes"}
        </p>
        {suggestions.length > 0 && (
          <ul
            ref={suggestionsRef}
            aria-label="Adresses suggérées"
            className="mt-2 divide-y overflow-hidden rounded-md border"
          >
            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion.label}-${index}`}>
                <button
                  type="button"
                  disabled={adding}
                  onClick={() => void addAddress(suggestion.address)}
                  onKeyDown={(e) => moveFocus(e, index)}
                  className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent disabled:opacity-50"
                >
                  <MapPin
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1">
                    Ajouter {suggestion.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
};

export default AddressNotToDoList;
