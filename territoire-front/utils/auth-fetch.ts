export const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");

    const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }), // Ajoute l'en-tête si dispo
    };

    return fetch(`${url}`, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
    });
};
