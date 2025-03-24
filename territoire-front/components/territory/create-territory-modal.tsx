"use client";

import React, {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {RootState, useAppDispatch} from "@/store/store";
import {addTerritory, fetchTerritories} from "@/store/slices/territory-slice";
import {fetchCities} from "@/store/slices/city-slice";
import {useRouter} from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "../ui/form";

// -------- SCHEMA ZOD --------
const formSchema = z.object({
    name: z.string().min(1, "Le nom est requis"),
    cityId: z.string().min(1, "La ville est requise"),
});

type FormSchema = z.infer<typeof formSchema>;

const CreateTerritoryModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const cities = useSelector((state: RootState) => state.cities.cities);
    const router = useRouter();

    const [isCreating, setIsCreating] = useState(false);
    const [open, setOpen] = useState(false);

    const form = useForm<FormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            cityId: "",
        },
    });

    useEffect(() => {
        if (cities.length === 0) {
            dispatch(fetchCities());
        }
    }, [dispatch, cities.length]);

    const handleCreateTerritory = async (values: FormSchema) => {
        if (isCreating) return;

        setIsCreating(true);
        try {
            const newTerritory = await dispatch(addTerritory(values)).unwrap();
            form.reset();
            dispatch(fetchTerritories());
            setOpen(false);
            router.push(`/territoires/${newTerritory.id}`);
        } catch (error) {
            console.error("Erreur lors de la création du territoire :", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
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

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreateTerritory)} className="space-y-4">
                        {/* Nom du territoire */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nom du territoire</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Quartier Nord" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Ville */}
                        <FormField
                            control={form.control}
                            name="cityId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ville</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une ville" />
                                            </SelectTrigger>
                                        </FormControl>
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
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Boutons */}
                        <AlertDialogFooter>
                            <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
                            <Button type="submit" disabled={isCreating}>
                                Valider
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </Form>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default CreateTerritoryModal;
