import {
  formatPhoneNumber as formatNationalPhoneNumber,
  formatPhoneNumberIntl,
} from "react-phone-number-input";

export const formatPhoneNumber = (phone: string): string => {
  // Numéro international (saisi avec l'indicatif ou importé) : groupage propre au pays
  if (phone.startsWith("+")) return formatPhoneNumberIntl(phone) || phone;
  return phone.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
};

const digitsOf = (value: string) => value.replace(/\D/g, "");

/**
 * La recherche correspond-elle au numéro, tapée avec ou sans indicatif ni espaces
 * (« 06 12 », « 0612 », « +33 6 12 ») ? Un numéro international se cherche aussi
 * sous sa forme nationale.
 */
export const phoneMatches = (phone: string, query: string): boolean => {
  if (!/^[\d\s+().-]+$/.test(query)) return false;
  const searched = digitsOf(query);
  if (!searched) return false;
  const national = phone.startsWith("+")
    ? formatNationalPhoneNumber(phone)
    : "";
  return [phone, national].some((variant) =>
    digitsOf(variant).includes(searched)
  );
};
