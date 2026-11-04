"use client";

import { AddressNotToDo } from "@/models/addressNotToDo";
import React, { useState } from "react";
import { Pencil, Trash, Check, Plus } from "lucide-react";

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

interface AddAddressNotToDoDto {
  street: string;
  number: string;
  zipCode: string;
  city: string;
}

const AddressNotToDoList = () => {
  const dispatch = useAppDispatch();

  // 📌 Récupération du territoire sélectionné
  const selectedTerritory = useAppSelector(
    (state) => state.territories.selectedTerritory
  );

  const [newAddress, setNewAddress] = useState<AddAddressNotToDoDto>({
    number: "",
    street: "",
    zipCode: "",
    city: "",
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedAddress, setEditedAddress] = useState<AddressNotToDo | null>(
    null
  );
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewAddress({ ...newAddress, [e.target.name]: e.target.value });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editedAddress) {
      setEditedAddress({ ...editedAddress, [e.target.name]: e.target.value });
    }
  };

  const handleAddAddress = async () => {
    if (!selectedTerritory) return;

    if (
      newAddress.street &&
      newAddress.number &&
      newAddress.zipCode &&
      newAddress.city
    ) {
      try {
        await dispatch(
          addAddressNotToVisit({
            territoryId: selectedTerritory.id,
            address: newAddress,
          })
        ).unwrap();
        setNewAddress({ street: "", number: "", zipCode: "", city: "" });
      } catch (error) {
        console.error("❌ Erreur lors de l'ajout de l'adresse :", error);
      }
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

      <div className="mt-4">
        <h3 className="mb-2 font-semibold">Ajouter une adresse</h3>
        <div className="flex flex-wrap gap-2">
          <Input
            type="text"
            name="number"
            placeholder="Numéro"
            value={newAddress.number}
            onChange={handleChange}
            className="w-auto min-w-28 flex-1"
          />
          <Input
            type="text"
            name="street"
            placeholder="Rue"
            value={newAddress.street}
            onChange={handleChange}
            className="w-auto min-w-28 flex-1"
          />
          <Input
            type="text"
            name="zipCode"
            placeholder="Code postal"
            value={newAddress.zipCode}
            onChange={handleChange}
            className="w-auto min-w-28 flex-1"
          />
          <Input
            type="text"
            name="city"
            placeholder="Ville"
            value={newAddress.city}
            onChange={handleChange}
            className="w-auto min-w-28 flex-1"
          />
          <Button aria-label="Ajouter l'adresse" onClick={handleAddAddress}>
            <Plus aria-hidden="true" />
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddressNotToDoList;
