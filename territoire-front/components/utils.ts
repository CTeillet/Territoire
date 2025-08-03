import { TerritoryStatus } from "@/models/territory-status";

export const formatPhoneNumber = (phone: string): string => {
    return phone.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
};

export const getBadgeColor = (status: TerritoryStatus) => {
    switch (status) {
        case "AVAILABLE":
            return "bg-purple-500"; // Reste inchangé
        case "ASSIGNED":
            return "bg-green-500"; // Jaune doré
        case "LATE":
            return "bg-pink-500"; // Reste inchangé
        case "PENDING":
            return "bg-blue-500"; // Bleu vif
        default:
            return "bg-gray-500";
    }
};
