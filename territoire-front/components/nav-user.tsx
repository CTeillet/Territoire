import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import { SidebarMenuButton } from "./ui/sidebar";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {ChevronsUpDown, LogOut} from "lucide-react";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "@/store/store";
import {logout} from "@/store/slices/auth-slice";
import {useRouter} from "next/navigation";
function NavUser() {
    const user = useSelector((state: RootState) => state.auth.user);
    const dispatch = useDispatch();
    const router = useRouter();

    // Vérifier si l'utilisateur est défini et connecté
    if (!user || !user.username || !user.email) return null;

    const handleLogout = () => {
        dispatch(logout());
        router.push("/login"); // Redirection après déconnexion
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="flex items-center gap-3 p-3 rounded-lg w-full hover:bg-gray-200">
                    <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarFallback className="rounded-lg">
                            {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col flex-1 text-left text-sm">
                        <span className="truncate font-semibold">{user.username}</span>
                        <span className="truncate text-xs text-gray-500">{user.email}</span>
                    </div>
                    <ChevronsUpDown className="size-4 text-gray-500" />
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48 rounded-lg">
                <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={handleLogout}>
                    <LogOut className="size-4" />
                    <span>Se déconnecter</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default NavUser;
