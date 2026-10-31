"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  createUserThunk,
  deleteUserThunk,
  fetchUsersThunk,
  resetUserPasswordThunk,
  updateUserRoleThunk,
} from "@/store/slices/user-slice";
import { RootState, useAppDispatch } from "@/store/store";
import { Role } from "@/models/role";
import CreateUserDialog from "@/components/parameters/user-management/create-user-dialog";
import UserTable from "@/components/parameters/user-management/user-table";
import { RegisterRequest } from "@/models/registerRequest";
import { toast } from "sonner";

const UserManagement = () => {
  const dispatch = useAppDispatch();
  const { users, loading } = useSelector((state: RootState) => state.users);
  const currentUser = useSelector((state: RootState) => state.auth.user); // Utilisateur connecté
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchUsersThunk());
  }, [dispatch]);

  const handleDeleteUser = async (id: string) => {
    setDeletingUserId(id);
    const result = await dispatch(deleteUserThunk(id));
    setDeletingUserId(null);
    if (deleteUserThunk.rejected.match(result)) {
      toast.error(result.payload ?? "Erreur lors de la suppression");
    }
  };

  // Ex. dernier administrateur : le serveur refuse et le rôle affiché reste l'ancien
  const handleUpdateRole = async (id: string, role: Role) => {
    const result = await dispatch(updateUserRoleThunk({ id, role }));
    if (updateUserRoleThunk.rejected.match(result)) {
      toast.error(result.payload ?? "Erreur lors de la mise à jour du rôle");
    }
  };

  const handleResetPassword = async (id: string, password: string) => {
    const result = await dispatch(resetUserPasswordThunk({ id, password }));
    if (resetUserPasswordThunk.rejected.match(result)) {
      toast.error(
        result.payload ?? "Erreur lors de la réinitialisation du mot de passe"
      );
      return false;
    }
    toast.success("Mot de passe réinitialisé");
    return true;
  };

  const handleCreateUser = async (user: RegisterRequest) => {
    const result = await dispatch(createUserThunk(user));
    if (createUserThunk.rejected.match(result)) {
      toast.error(result.payload ?? "Erreur lors de la création");
    } else {
      toast.success("Utilisateur créé");
    }
  };

  return (
    <div className="mt-4 mr-5 ml-5">
      <UserTable
        users={users}
        loading={loading}
        currentUserId={currentUser?.id || null}
        deletingUserId={deletingUserId}
        onDelete={handleDeleteUser}
        onUpdateRole={handleUpdateRole}
        onResetPassword={handleResetPassword}
      />
      <CreateUserDialog onCreate={handleCreateUser} />
    </div>
  );
};

export default UserManagement;
