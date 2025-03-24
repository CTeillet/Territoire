"use client";

import {useAppDispatch} from "@/store/store";
import React from "react";
import { z } from "zod"
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Plus} from "lucide-react";
import {addCity} from "@/store/slices/city-slice";
import { useForm } from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";

const formSchema = z.object({
    name: z.string().min(1, "Le nom est requis"),
    zipCode: z
        .string()
        .min(5, "Le code postal doit contenir au moins 5 caractères")
        .max(10, "Le code postal est trop long"),
})

type CityFormValues = z.infer<typeof formSchema>

const FormAddCity: React.FC = () => {
    const dispatch = useAppDispatch()

    const form = useForm<CityFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            zipCode: "",
        },
    })

    const onSubmit = (values: CityFormValues) => {
        dispatch(addCity(values))
        form.reset()
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Ajouter une ville :</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 items-end flex-wrap">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nom</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nom de la ville" className="w-64" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="zipCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code postal</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Code postal" className="w-64" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" variant="default" className="h-10 mt-2">
                                <Plus />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </Form>

    )
}

export default FormAddCity


