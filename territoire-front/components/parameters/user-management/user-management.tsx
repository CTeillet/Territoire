"use client";

import {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {createUserThunk, deleteUserThunk, fetchUsersThunk, updateUserRoleThunk} from "@/store/slices/user-slice";
import {RootState, useAppDispatch} from "@/store/store";
import {Role} from "@/models/role";
import CreateUserDialog from "@/components/parameters/user-management/create-user-dialog";
import UserTable from "@/components/parameters/user-management/user-table";

const UserManagement = () => {
    const dispatch = useAppDispatch();
    const {users, loading} = useSelector((state: RootState) => state.users);
    const currentUser = useSelector((state: RootState) => state.auth.user); // Utilisateur connecté
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchUsersThunk());
    }, [dispatch]);

    const handleDeleteUser = async (id: string) => {
        setDeletingUserId(id);
        await dispatch(deleteUserThunk(id));
        setDeletingUserId(null);
    };

    const handleUpdateRole = (id: string, role: Role) => {
        dispatch(updateUserRoleThunk({id, role}));
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
            />
            <CreateUserDialog onCreate={(user) => dispatch(createUserThunk(user))}/>
        </div>
    );
};

export default UserManagement;
