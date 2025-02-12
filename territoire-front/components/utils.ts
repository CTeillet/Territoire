export const formatPhoneNumber = (phone: string): string => {
    return phone.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
};
