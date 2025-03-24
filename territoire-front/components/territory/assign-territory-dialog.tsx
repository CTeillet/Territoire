"use client";

import React, {useState} from "react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,} from "@/components/ui/command";
import {ChevronsUpDown} from "lucide-react";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {Person} from "@/models/person";

interface AssignTerritoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    people: Person[];
    onAssign: (personId: string | null, newPerson: { firstName: string; lastName: string }) => void;
}

// Zod schema : au moins une des deux options doit être remplie
const assignSchema = z
    .object({
        personId: z.string().nullable(),
        firstName: z.string(),
        lastName: z.string(),
    })
    .superRefine((data, ctx) => {
            const {personId, firstName, lastName} = data;
            const hasSelectedPerson = !!personId;
            const hasFirstName = firstName.trim() !== "";
            const hasLastName = lastName.trim() !== "";

            if (!hasSelectedPerson) {
                if (!hasFirstName && !hasLastName) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["firstName"],
                        message: "Sélectionnez une personne ou entrez un prénom et un nom",
                    });
                    ctx.addIssue({
                        code: "custom",
                        path: ["lastName"],
                        message: "Sélectionnez une personne ou entrez un prénom et un nom",
                    });
                } else if (hasFirstName && !hasLastName) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["lastName"],
                        message: "Le nom est requis",
                    });
                } else if (!hasFirstName && hasLastName) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["firstName"],
                        message: "Le prénom est requis",
                    });
                }
            }
        }
    );

type AssignForm = z.infer<typeof assignSchema>;

const AssignTerritoryDialog: React.FC<AssignTerritoryDialogProps> = (
    {
        isOpen,
        onOpenChange,
        people,
        onAssign,
    }) => {
    const [popoverOpen, setPopoverOpen] = useState(false);

    const form = useForm<AssignForm>({
        resolver: zodResolver(assignSchema),
        defaultValues: {
            personId: null,
            firstName: "",
            lastName: "",
        },
    });

    const handleSubmit = (data: AssignForm) => {
        onAssign(data.personId, {
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
        });
        form.reset();
        onOpenChange(false);
    };

    const selectedPerson = form.watch("personId");
    const isDisabled = selectedPerson !== null;

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Assigner une personne au territoire</AlertDialogTitle>
                </AlertDialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        {/* Sélection d'une personne existante */}
                        <FormField
                            control={form.control}
                            name="personId"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Personne existante</FormLabel>
                                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between"
                                            >
                                                {field.value
                                                    ? people.find((p) => p.id === field.value)?.firstName +
                                                    " " +
                                                    people.find((p) => p.id === field.value)?.lastName
                                                    : "Sélectionner une personne ou aucune"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50"/>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput placeholder="Rechercher une personne..." className="h-9"/>
                                                <CommandList>
                                                    <CommandEmpty>Aucune personne trouvée.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            value="none"
                                                            onSelect={() => {
                                                                field.onChange(null);
                                                                setPopoverOpen(false);
                                                            }}
                                                        >
                                                            Aucune personne
                                                        </CommandItem>
                                                        {people.map((person) => (
                                                            <CommandItem
                                                                key={person.id}
                                                                value={`${person.firstName} ${person.lastName}`}
                                                                onSelect={() => {
                                                                    field.onChange(person.id);
                                                                    setPopoverOpen(false);
                                                                }}
                                                            >
                                                                {person.firstName} {person.lastName}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </FormItem>
                            )}
                        />

                        {/* Création d'une nouvelle personne */}
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Prénom</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="Prénom"
                                            disabled={isDisabled}
                                            className={isDisabled ? "opacity-50 cursor-not-allowed bg-gray-200" : ""}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Requis si aucune personne n’est sélectionnée
                                    </FormDescription>
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
                                        <Input
                                            {...field}
                                            placeholder="Nom"
                                            disabled={isDisabled}
                                            className={isDisabled ? "opacity-50 cursor-not-allowed bg-gray-200" : ""}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Requis si aucune personne n’est sélectionnée
                                    </FormDescription>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <AlertDialogFooter>
                            <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
                            <Button type="submit" className="w-full">
                                Confirmer l&apos;assignation
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </Form>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default AssignTerritoryDialog;
