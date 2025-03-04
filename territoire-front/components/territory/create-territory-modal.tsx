"use client";

import React, {useEffect, useState} from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {RootState, useAppDispatch} from "@/store/store";
import {addTerritory, fetchTerritories} from "@/store/slices/territory-slice";
import { fetchCities } from "@/store/slices/city-slice";

const CreateTerritoryModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const cities = useSelector((state: RootState) => state.cities.cities);

    // Si `cities` est vide, on va chercher les données du backend
    useEffect(() => {
        if (cities.length === 0) {
            dispatch(fetchCities());
        }
    }, [dispatch, cities.length]);

    // État local du formulaire
    const [territoryName, setTerritoryName] = useState("");
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateTerritory = async () => {
        if (!territoryName.trim() || isCreating || !selectedCity) return;

        setIsCreating(true);
        try {
            await dispatch(addTerritory({name: territoryName, cityId: selectedCity})).unwrap();
            setTerritoryName("");
            dispatch(fetchTerritories()); // Recharge la liste après ajout
        } catch (error) {
            console.error("Erreur lors de la création du territoire :", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="default">Créer un territoire</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Créer un territoire</AlertDialogTitle>
                    <AlertDialogDescription>
                        Remplissez les informations ci-dessous pour ajouter un nouveau territoire.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {/* Champ Nom du territoire */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Nom du territoire</label>
                    <Input
                        type="text"
                        value={territoryName}
                        onChange={(e) => setTerritoryName(e.target.value)}
                        placeholder="Ex: Quartier Nord"
                    />
                </div>

                {/* Sélecteur de Ville */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Ville</label>
                    <Select onValueChange={(value) => setSelectedCity(value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une ville" />
                        </SelectTrigger>
                        <SelectContent>
                            {cities.length > 0 ? (
                                cities.map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                        {city.name}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>
                                    Aucune ville disponible
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {/* Footer de la popup */}
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCreateTerritory} disabled={!territoryName || !selectedCity}>
                        Valider
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default CreateTerritoryModal;
