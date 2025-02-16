import { Address } from "@/models/address";
import React, { useState } from "react";
import { Pencil, Trash, Check, PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const AddressNotToDoList = ({ addresses }: { addresses: Address[] }) => {
    const [addressList, setAddressList] = useState<Address[]>(addresses);
    const [newAddress, setNewAddress] = useState<Address>({ number: "", street: "", zipCode: "", city: "" });

    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editedAddress, setEditedAddress] = useState<Address | null>(null);

    const [deleteIndex, setDeleteIndex] = useState<number | null>(null); // Index de l'adresse à supprimer
    const [isDialogOpen, setIsDialogOpen] = useState(false); // État de la modale

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewAddress({ ...newAddress, [e.target.name]: e.target.value });
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (editedAddress) {
            setEditedAddress({ ...editedAddress, [e.target.name]: e.target.value });
        }
    };

    const handleAddAddress = () => {
        if (newAddress.street && newAddress.number && newAddress.zipCode && newAddress.city) {
            setAddressList([...addressList, newAddress]);
            setNewAddress({ street: "", number: "", zipCode: "", city: "" });
        }
    };

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setEditedAddress({ ...addressList[index] });
    };

    const handleSaveEdit = () => {
        if (editedAddress && editingIndex !== null) {
            const updatedList = [...addressList];
            updatedList[editingIndex] = editedAddress;
            setAddressList(updatedList);
            setEditingIndex(null);
            setEditedAddress(null);
        }
    };

    // Ouvre la modale de confirmation
    const handleDeleteClick = (index: number) => {
        setDeleteIndex(index);
        setIsDialogOpen(true);
    };

    // Supprime une adresse après confirmation
    const handleConfirmDelete = () => {
        if (deleteIndex !== null) {
            setAddressList(addressList.filter((_, i) => i !== deleteIndex));
            setDeleteIndex(null);
            setIsDialogOpen(false);
        }
    };

    return (
        <div className="mt-6 border border-gray-200 bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-2">🚫 Adresses à ne pas visiter</h2>

            <ul>
                {addressList.map((address, index) => (
                    <li key={index} className="p-2 border-b flex justify-between items-center">
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
                                    <button onClick={() => handleDeleteClick(index)} className="text-red-500 hover:text-red-700">
                                        <Trash size={18} />
                                    </button>
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

            {/* Dialog de confirmation de suppression */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogTitle>Confirmer la suppression</DialogTitle>
                    <DialogDescription>
                        Êtes-vous sûr de vouloir supprimer cette adresse ? Cette action est irréversible.
                    </DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete}>Supprimer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AddressNotToDoList;
