import { useSelector } from 'react-redux';
import {RootState} from "@/store/store";

export function useAuth() {
    const { user, token } = useSelector((state: RootState) => state.auth);
    return { isAuthenticated: !!token, user };
}
