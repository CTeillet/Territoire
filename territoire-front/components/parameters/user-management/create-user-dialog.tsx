"use client";

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCcw, Plus } from "lucide-react";
import { generatePassword } from "@/utils/password";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterRequest } from "@/models/registerRequest";
import {RoleSchema} from "@/models/role";
import {useState} from "react";

type CreateUserDialogProps = {
    onCreate: (user: RegisterRequest) => void;
};

const formSchema = z.object({
    username: z.string().min(1, "Nom requis"),
    email: z.string().email("Email invalide"),
    role: RoleSchema,
    password: z.string(),
});

const CreateUserDialog = ({ onCreate }: CreateUserDialogProps) => {
    const [open, setOpen] = useState(false);


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            email: "",
            role: "UTILISATEUR",
            password: generatePassword(),
        },
    });

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onCreate(values);
        form.reset({
            username: "",
            email: "",
            role: "UTILISATEUR",
            password: generatePassword(),
        });
        setOpen(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button>
                    <Plus />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Créer un nouvel utilisateur</AlertDialogTitle>
                </AlertDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nom</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Prénom / Nom" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="Email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rôle</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-40">
                                                <SelectValue placeholder="Sélectionner un rôle" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="UTILISATEUR">Utilisateur</SelectItem>
                                            <SelectItem value="GESTIONNAIRE">Gestionnaire</SelectItem>
                                            <SelectItem value="SUPERVISEUR">Superviseur</SelectItem>
                                            <SelectItem value="ADMIN">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mot de passe</FormLabel>
                                    <div className="flex items-center">
                                        <FormControl>
                                            <Input {...field} readOnly />
                                        </FormControl>
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                form.setValue("password", generatePassword())
                                            }
                                            className="ml-2"
                                        >
                                            <RefreshCcw />
                                        </Button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <AlertDialogFooter className="flex justify-end gap-2">
                            <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
                            <Button type="submit">Créer</Button>
                        </AlertDialogFooter>
                    </form>
                </Form>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default CreateUserDialog;
