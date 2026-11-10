"use client";

import { useState } from "react";
import { useIsClient } from "@/hooks/use-is-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarMenuButton } from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, KeyRound, LogOut } from "lucide-react";
import ChangePasswordDialog from "@/components/change-password-dialog";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { logout } from "@/store/slices/auth-slice";
import { logoutRequest } from "@/utils/auth-fetch";
import { useRouter } from "next/navigation";

function NavUser() {
  const mounted = useIsClient();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const router = useRouter();

  // Attendre que le composant soit monté avant d'afficher quoi que ce soit
  if (!mounted || !user || !user.username || !user.email) return null;

  const handleLogout = async () => {
    // Révoque les jetons côté serveur et supprime le cookie de refresh HttpOnly
    await logoutRequest();
    dispatch(logout());
    router.push("/login"); // Redirection après déconnexion
  };

  const handlePasswordChanged = () => {
    // Les jetons ont été révoqués côté serveur : on nettoie la session locale
    dispatch(logout());
    router.push("/login");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton className="flex items-center gap-3 p-3 rounded-lg w-full hover:bg-sidebar">
            <Avatar className="h-10 w-10 rounded-lg">
              <AvatarFallback className="rounded-lg">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col flex-1 text-left text-sm">
              <span className="truncate font-semibold">{user.username}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48 rounded-lg">
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setPasswordOpen(true)}
          >
            <KeyRound className="size-4" />
            <span>Changer mon mot de passe</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            <span>Se déconnecter</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        onChanged={handlePasswordChanged}
      />
    </>
  );
}

export default NavUser;
