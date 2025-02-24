"use client";

import { AddressNotToDo } from "@/models/addressNotToDo";
import React, {useState} from "react";
import { Pencil, Trash, Check, PlusCircle } from "lucide-react";

import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { addAddressNotToVisit, deleteAddressNotToVisit, modifyAddressNotToVisit } from "@/store/slices/territory-slice";

interface AddAddressNotToDoDto {
    street: string;
    number: string;
    zipCode: string;
    city: string;
}

const AddressNotToDoList = () => {
    const dispatch = useAppDispatch();

    // 📌 Récupération du territoire sélectionné
    const selectedTerritory = useAppSelector((state) => state.territories.selectedTerritory);

    const [newAddress, setNewAddress] = useState<AddAddressNotToDoDto>({ number: "", street: "", zipCode: "", city: "" });
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editedAddress, setEditedAddress] = useState<AddressNotToDo | null>(null);
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

        if (newAddress.street && newAddress.number && newAddress.zipCode && newAddress.city) {
            try {
                await dispatch(addAddressNotToVisit({ territoryId: selectedTerritory.id, address: newAddress })).unwrap();
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
        if (!selectedTerritory || deleteIndex === null || !selectedTerritory.addressesNotToDo[deleteIndex].id) return;

        setDeleting(true);
        try {
            await dispatch(deleteAddressNotToVisit({ territoryId: selectedTerritory.id, addressId: selectedTerritory.addressesNotToDo[deleteIndex].id })).unwrap();
            setDeleteIndex(null);
        } catch (error) {
            console.error("❌ Erreur lors de la suppression de l'adresse :", error);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="mt-6 border border-gray-200 bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-2">🚫 Adresses à ne pas visiter</h2>

            <ul>
                {selectedTerritory?.addressesNotToDo?.map((address, index) => (
                    <li key={address.id} className="p-2 border-b flex justify-between items-center">
                        {editingIndex === index ? (
                            <div className="flex gap-2">
                                <input type="text" name="number" value={editedAddress?.number || ""} onChange={handleEditChange} className="border p-1 rounded w-16" />
                                <input type="text" name="street" value={editedAddress?.street || ""} onChange={handleEditChange} className="border p-1 rounded w-40" />
                                <input type="text" name="zipCode" value={editedAddress?.zipCode || ""} onChange={handleEditChange} className="border p-1 rounded w-20" />
                                <input type="text" name="city" value={editedAddress?.city || ""} onChange={handleEditChange} className="border p-1 rounded w-32" />
                                <button onClick={handleSaveEdit} className="bg-green-500 text-white p-1 rounded hover:bg-green-600 flex items-center gap-1">
                                    <Check size={16} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <span>{address.number}, {address.street} - {address.zipCode} {address.city}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(index)} className="text-blue-500 hover:text-blue-700">
                                        <Pencil size={18} />
                                    </button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="p-2" onClick={() => handleDeleteClick(index)}>
                                                {deleting ? "Suppression..." : <Trash size={18} />}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Êtes-vous sûr de vouloir supprimer l&#39;adresse <b>{address.number} {address.street}</b> ?<br/>
                                                    Cette action est irréversible.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="flex justify-end gap-2">
                                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
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
                <h3 className="text-md font-semibold mb-2">Ajouter une adresse</h3>
                <div className="flex flex-wrap gap-2">
                    <input type="text" name="number" placeholder="Numéro" value={newAddress.number} onChange={handleChange} className="border p-2 rounded" />
                    <input type="text" name="street" placeholder="Rue" value={newAddress.street} onChange={handleChange} className="border p-2 rounded" />
                    <input type="text" name="zipCode" placeholder="Code postal" value={newAddress.zipCode} onChange={handleChange} className="border p-2 rounded" />
                    <input type="text" name="city" placeholder="Ville" value={newAddress.city} onChange={handleChange} className="border p-2 rounded" />
                    <button onClick={handleAddAddress} className="bg-red-500 text-white p-2 rounded hover:bg-red-600 flex items-center gap-1">
                        <PlusCircle size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddressNotToDoList;
