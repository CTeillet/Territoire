export const authFetch = async (url: string, options: RequestInit = {}) => {
    // Get token from cookies instead of localStorage
    const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

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
