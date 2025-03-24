"use client";

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import DeleteUserDialog from "@/components/parameters/user-management/delete-user-dialog";
import {Role} from "@/models/role";
import {User} from "@/models/user"; // Assure-toi que ce type existe

type Props = {
    users: User[];
    loading: boolean;
    currentUserId: string | null;
    deletingUserId: string | null;
    onUpdateRole: (id: string, role: Role) => void;
    onDelete: (id: string) => void;
};

const UserTable = (
    {
        users,
        loading,
        currentUserId,
        deletingUserId,
        onUpdateRole,
        onDelete
    }: Props) => {
    return (
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
                                <Select defaultValue={user.role}
                                        onValueChange={(value: Role) => onUpdateRole(user.id, value)}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Sélectionner un rôle"/>
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
                                {currentUserId !== user.id ? (
                                    <DeleteUserDialog
                                        username={user.username}
                                        userId={user.id}
                                        isDeleting={deletingUserId === user.id}
                                        onDelete={onDelete}
                                    />
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
    );
};

export default UserTable;
