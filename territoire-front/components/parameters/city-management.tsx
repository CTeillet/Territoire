"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {Plus, Trash2} from "lucide-react";
import {RootState, useAppDispatch} from "@/store/store";
import {addCity, fetchCities, removeCity} from "@/store/slices/city-slice";
import {Card, CardContent, CardHeader, CardTitle} from "../ui/card";

const CityManager: React.FC = () => {
    const dispatch = useAppDispatch();
    const { cities, loading, error } = useSelector((state: RootState) => state.cities);
    const [cityName, setCityName] = useState("");
    const [zipCode, setZipCode] = useState("");

    useEffect(() => {
        dispatch(fetchCities());
    }, [dispatch]);

    const handleAddCity = () => {
        if (cityName.trim() && zipCode.trim()) {
            dispatch(addCity({name:cityName, zipCode: zipCode}));
            setCityName("");
            setZipCode("")
        }
    };

    const handleRemoveCity = (id: string) => {
        dispatch(removeCity(id));
    };
    return (
        <div className="p-6 space-y-6">
            {/* Titre */}
            <h2 className="text-2xl font-semibold">Gestion des villes</h2>

            {/* Formulaire d'ajout */}
            <div className="flex items-center gap-4">
                <Input
                    type="text"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="Nom de la ville"
                    className="w-64"
                />
                <Input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="Code Postal"
                    className="w-64"
                />
                <Button onClick={handleAddCity} variant="default">
                    <Plus/>
                </Button>
            </div>

            {/* Affichage des erreurs et chargement */}
            {loading && <p className="text-gray-500">Chargement des villes...</p>}
            {error && <p className="text-red-500">Erreur : {error}</p>}

            {/* Table des villes avec mise en avant */}
            <Card className="shadow-lg border border-gray-200">
                <CardHeader>
                    <CardTitle>Liste des villes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-3/4">Nom</TableHead>
                                <TableHead className="w-1/4 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cities.map((city) => (
                                <TableRow key={city.id}>
                                    <TableCell>{city.name}</TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveCity(city.id)}
                                        >
                                            <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default CityManager;
