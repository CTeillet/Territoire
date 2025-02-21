"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { login } from "@/store/slices/auth-slice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {authFetch} from "@/utils/auth-fetch";

const LoginPage = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await authFetch(`/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                setError("Échec de l'authentification"); // Corrige le warning `throw` inutile
                return; // Arrête la fonction ici
            }

            const data = await response.json();
            document.cookie = `token=${data.token}; path=/;`;

            dispatch(login({ user: data.user, token: data.token }));
            router.push("/"); // Redirige après connexion
        } catch {
            setError("Identifiants incorrects. Veuillez réessayer.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg w-96">
                <h2 className="text-2xl font-bold mb-6 text-center">Connexion</h2>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Email</label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Mot de passe</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Connexion..." : "Se connecter"}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
