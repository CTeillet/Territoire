export const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");

    const isFormData = options.body instanceof FormData;

    const headers: HeadersInit = {
        ...(token && { Authorization: `Bearer ${token}` }),
        // On ajoute Content-Type uniquement si ce n’est pas un FormData
        ...(!isFormData && { "Content-Type": "application/json" }),
        ...(options.headers || {}),
    };

    return fetch(`${url}`, {
        ...options,
        headers,
    });
};
