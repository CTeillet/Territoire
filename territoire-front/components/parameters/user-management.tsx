"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import {createUserThunk, deleteUserThunk, fetchUsersThunk, updateUserRoleThunk} from "@/store/slices/user-slice";
import {RootState, useAppDispatch} from "@/store/store";
import {generatePassword} from "@/utils/password";
import {Role} from "@/models/role";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "../ui/alert-dialog";
import {RefreshCcw, Trash2} from "lucide-react";

const UserManagement = () => {
    const dispatch = useAppDispatch();
    const { users, loading } = useSelector((state: RootState) => state.users);
    const currentUser = useSelector((state: RootState) => state.auth.user); // Utilisateur connecté

    const [newUser, setNewUser] = useState({ username: "", email: "", password: generatePassword() });
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchUsersThunk());
    }, [dispatch]);

    const handleCreateUser = () => {
        dispatch(createUserThunk(newUser));
    };

    const handleDeleteUser = async (id: string) => {
        setDeletingUserId(id);
        await dispatch(deleteUserThunk(id));
        setDeletingUserId(null);
    };

    const handleUpdateRole = (id: string, role: Role) => {
        dispatch(updateUserRoleThunk({ id, role }));
    };

    return (
        <Tabs defaultValue="users">
            <TabsList>
                <TabsTrigger value="users">Utilisateurs</TabsTrigger>
                <TabsTrigger value="settings">Autres paramètres</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
                <div className="mt-4 mr-5 ml-5">
                    <Table className="w-full border border-gray-200 rounded-sm shadow-sm mb-5">
                        <TableHeader>
                            <TableRow className="bg-gray-100">
                                <TableHead className="text-left px-4 py-2">Nom</TableHead>
                                <TableHead className="text-left px-4 py-2">Email</TableHead>
                                <TableHead className="text-left px-4 py-2">Rôle</TableHead>
                                <TableHead className="text-left px-4 py-2">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4">Chargement...</TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow
                                        key={user.id}
                                        className="hover:bg-gray-50 transition duration-200 border-b last:border-b-0"
                                    >
                                        <TableCell className="px-4 py-3">{user.username}</TableCell>
                                        <TableCell className="px-4 py-3">{user.email}</TableCell>
                                        <TableCell className="px-4 py-3">
                                            <Select defaultValue={user.role} onValueChange={(value: Role) => handleUpdateRole(user.id, value)}>
                                                <SelectTrigger className="w-40">
                                                    <SelectValue placeholder="Sélectionner un rôle" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="UTILISATEUR">Utilisateur</SelectItem>
                                                    <SelectItem value="GESTIONNAIRE">Gestionnaire</SelectItem>
                                                    <SelectItem value="SUPERVISEUR">Superviseur</SelectItem>
                                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            {currentUser?.id !== user.id ? (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            className="p-2"
                                                            disabled={deletingUserId === user.id}
                                                        >
                                                            {deletingUserId === user.id ? "Suppression..." : <Trash2 size={18} />}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Êtes-vous sûr de vouloir supprimer <b>{user.username}</b> ?<br/>
                                                                Cette action est irréversible.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="flex justify-end gap-2">
                                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="bg-red-600 hover:bg-red-700"
                                                            >
                                                                Supprimer
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            ) : (
                                                <Button disabled className="px-3 py-1 text-sm cursor-not-allowed opacity-50">
                                                    Vous
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button>
                                + Ajouter un utilisateur
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Créer un nouvel utilisateur</AlertDialogTitle>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Input placeholder="Prénom / Nom" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
                                <Input placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                                <div className="flex items-center">
                                    <Input type="text" value={newUser.password} className="flex-1" />
                                    <Button onClick={() => setNewUser({ ...newUser, password: generatePassword() })} className="ml-2">
                                        <RefreshCcw/>
                                    </Button>
                                </div>
                            </div>
                            <AlertDialogFooter className="flex justify-end gap-2">
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCreateUser}>
                                    Créer
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </TabsContent>
        </Tabs>
    );
};

export default UserManagement;
