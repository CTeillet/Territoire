"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import {createUserThunk, deleteUserThunk, fetchUsersThunk, updateUserRoleThunk} from "@/store/slices/user-slice";
import {RootState, useAppDispatch} from "@/store/store";
import {generatePassword} from "@/utils/password";
import {Role} from "@/models/role";

const UserManagement = () => {
    const dispatch = useAppDispatch();
    const { users, loading } = useSelector((state: RootState) => state.users);

    const [isDialogOpen, setDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({ username: "", email: "", password: generatePassword() });

    useEffect(() => {
        dispatch(fetchUsersThunk());
    }, [dispatch]);

    const handleCreateUser = () => {
        dispatch(createUserThunk(newUser));
        setDialogOpen(false);
    };

    const handleDeleteUser = (id: string) => {
        dispatch(deleteUserThunk(id));
    };

    const handleUpdateRole = (id:string, role: Role) => {
        dispatch(updateUserRoleThunk({ id, role }));
    };

    return (
        <Tabs defaultValue="users">
            <TabsList>
                <TabsTrigger value="users">Utilisateurs</TabsTrigger>
                <TabsTrigger value="settings">Autres paramètres</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
                <div className="mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4}>Chargement...</TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>{`${user.username}`}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Select defaultValue={user.role} onValueChange={(value: Role) => handleUpdateRole(user.id, value)}>
                                                <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="UTILISATEUR">Utilisateur</SelectItem>
                                                    <SelectItem value="GESTIONNAIRE">Gestionnaire</SelectItem>
                                                    <SelectItem value="SUPERVISEUR">Superviseur</SelectItem>
                                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="destructive" onClick={() => handleDeleteUser(user.id)}>Supprimer</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="mt-4">+ Ajouter un utilisateur</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
                            <div className="space-y-2">
                                <Input placeholder="Prénom / Nom" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
                                <Input placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                                <div className="flex items-center">
                                    <Input type="text" value={newUser.password} />
                                    <Button onClick={() => setNewUser({ ...newUser, password: generatePassword() })}>🔄</Button>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateUser}>Créer</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </TabsContent>
        </Tabs>
    );
};

export default UserManagement;
