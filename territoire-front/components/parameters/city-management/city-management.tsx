"use client";

import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import {RootState, useAppDispatch} from "@/store/store";
import {fetchCities} from "@/store/slices/city-slice";
import FormAddCity from "./form-add-city";
import ListCity from "@/components/parameters/city-management/list-city";

const CityManager: React.FC = () => {
    const dispatch = useAppDispatch();
    const { cities, loading, error } = useSelector((state: RootState) => state.cities);

    useEffect(() => {
        dispatch(fetchCities());
    }, [dispatch]);

    return (
        <div className="p-6 space-y-6">
            {/* Titre */}
            <h2 className="text-2xl font-semibold">Gestion des villes</h2>

            {/* Formulaire d'ajout de ville */}
            <FormAddCity/>

            {/* Affichage des erreurs et chargement */}
            {loading && <p className="text-gray-500">Chargement des villes...</p>}
            {error && <p className="text-red-500">Erreur : {error}</p>}

            {/* Table des villes avec mise en avant */}
            <ListCity cities={cities}/>
        </div>
    );
};

export default CityManager;
