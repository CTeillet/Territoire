"use client";

import React, {useState} from "react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {Person} from "@/models/person";
import {toast} from "sonner";
import {Plus} from "lucide-react";

type CreatePersonDialogProps = {
    onCreate: (person: Person) => Promise<void>;
    isLoading: boolean;
};

const createPersonSchema = z.object({
    firstName: z.string().min(1, "Le prénom est requis"),
    lastName: z.string().min(1, "Le nom est requis"),
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    phoneNumber: z.string().optional().or(z.literal("")),
});

type CreatePersonForm = z.infer<typeof createPersonSchema>;

const CreatePersonDialog: React.FC<CreatePersonDialogProps> = (
    {
        onCreate,
        isLoading,
    }) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    const form = useForm<CreatePersonForm>({
        resolver: zodResolver(createPersonSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phoneNumber: "",
        },
    });

    const handleSubmit = async (data: CreatePersonForm) => {
        try {
            await onCreate({
                id: null,
                firstName: data.firstName.trim(),
                lastName: data.lastName.trim(),
                email: data.email?.trim() || undefined,
                phoneNumber: data.phoneNumber?.trim() || undefined,
            });

            toast.success("La personne a bien été ajoutée !");
            form.reset();
            setDialogOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Échec de l'ajout de la personne. Veuillez réessayer.");
        }
    };

    return (
        <AlertDialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
        }}>
            <AlertDialogTrigger>
                <Button variant="default" size="lg" className="flex justify-end mt-4">
                    <Plus className="w-4 h-4"/>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Créer une nouvelle personne</AlertDialogTitle>
                </AlertDialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Prénom</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Prénom *" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="lastName"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Nom</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nom *" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Email (optionnel)" type="email" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Sera utilisé pour contacter la personne.
                                    </FormDescription>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Téléphone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Téléphone (optionnel)" type="tel" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Numéro de contact (facultatif).
                                    </FormDescription>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <AlertDialogFooter>
                            <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Ajout en cours..." : "Ajouter la personne"}
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </Form>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default CreatePersonDialog;
