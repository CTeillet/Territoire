import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
    console.log("Middleware exécuté :", req.nextUrl.pathname);


    const token = req.cookies.get('token')?.value; // Récupère le token JWT

    if (!token) {
        // Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
        return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
}

// Applique le middleware à toutes les pages sauf celles de connexion
export const config = {
    matcher: '/((?!login|register|api).*)', // Exclut /login, /register et les API
};
