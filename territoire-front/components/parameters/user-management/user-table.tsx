"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DeleteUserDialog from "@/components/parameters/user-management/delete-user-dialog";
import ResetPasswordDialog from "@/components/parameters/user-management/reset-password-dialog";
import { Role } from "@/models/role";
import { User } from "@/models/user"; // Assure-toi que ce type existe
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  users: User[];
  loading: boolean;
  currentUserId: string | null;
  deletingUserId: string | null;
  onUpdateRole: (id: string, role: Role) => void;
  onDelete: (id: string) => void;
  onResetPassword: (id: string, password: string) => Promise<boolean>;
};

const RoleSelect = ({
  user,
  onUpdateRole,
  className,
}: {
  user: User;
  onUpdateRole: Props["onUpdateRole"];
  className: string;
}) => (
  <Select
    value={user.role}
    onValueChange={(value: Role) => onUpdateRole(user.id, value)}
  >
    <SelectTrigger
      className={className}
      aria-label={`Rôle de ${user.username}`}
    >
      <SelectValue placeholder="Sélectionner un rôle" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="UTILISATEUR">Utilisateur</SelectItem>
      <SelectItem value="GESTIONNAIRE">Gestionnaire</SelectItem>
      <SelectItem value="SUPERVISEUR">Superviseur</SelectItem>
      <SelectItem value="ADMIN">Admin</SelectItem>
    </SelectContent>
  </Select>
);

const UserActions = ({
  user,
  currentUserId,
  deletingUserId,
  onDelete,
  onResetPassword,
}: { user: User } & Pick<
  Props,
  "currentUserId" | "deletingUserId" | "onDelete" | "onResetPassword"
>) =>
  currentUserId !== user.id ? (
    <div className="flex gap-2">
      <ResetPasswordDialog
        username={user.username}
        userId={user.id}
        onReset={onResetPassword}
      />
      <DeleteUserDialog
        username={user.username}
        userId={user.id}
        isDeleting={deletingUserId === user.id}
        onDelete={onDelete}
      />
    </div>
  ) : (
    <Button
      disabled
      className="px-3 py-1 text-sm cursor-not-allowed opacity-50"
    >
      Vous
    </Button>
  );

const UserTable = ({ users, loading, onUpdateRole, ...actions }: Props) => {
  const isMobile = useIsMobile();

  // Téléphone : une fiche par utilisateur, le tableau ne tient pas sur la largeur
  if (isMobile) {
    return loading ? (
      <p className="py-4 text-center">Chargement...</p>
    ) : (
      <ul className="mb-5 space-y-3">
        {users.map((user) => (
          <li
            key={user.id}
            className="space-y-3 rounded-lg border bg-white p-4 shadow-sm"
          >
            <div className="min-w-0">
              <p className="font-medium">{user.username}</p>
              <p className="text-sm break-all text-muted-foreground">
                {user.email}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <RoleSelect
                user={user}
                onUpdateRole={onUpdateRole}
                className="w-44 max-md:h-11"
              />
              <UserActions user={user} {...actions} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

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
            <TableCell colSpan={4} className="text-center py-4">
              Chargement...
            </TableCell>
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
                <RoleSelect
                  user={user}
                  onUpdateRole={onUpdateRole}
                  className="w-40"
                />
              </TableCell>
              <TableCell className="px-4 py-3">
                <UserActions user={user} {...actions} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default UserTable;
