import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import { PhoneInput } from "@/components/ui/phone-input";

interface PersonEditFormProps {
  formData: {
    firstName: string;
    lastName: string;
    email: string | undefined;
    phoneNumber: string | undefined;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhoneChange: (value: string) => void;
}

const PersonEditForm = ({
  formData,
  onChange,
  onPhoneChange,
}: PersonEditFormProps) => {
  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="person-firstName"
              className="block text-sm font-medium mt-2"
            >
              Prénom :
            </label>
            <input
              id="person-firstName"
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded mt-1"
            />
          </div>
          <div>
            <label
              htmlFor="person-lastName"
              className="block text-sm font-medium mt-2"
            >
              Nom :
            </label>
            <input
              id="person-lastName"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded mt-1"
            />
          </div>
          <div>
            <label
              htmlFor="person-email"
              className="block text-sm font-medium mt-2"
            >
              Email :
            </label>
            <input
              id="person-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              className="w-full px-3 py-2 border rounded mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mt-2">
              Téléphone :
            </label>
            <PhoneInput
              value={formData.phoneNumber}
              onChange={onPhoneChange}
              placeholder="Téléphone (optionnel)"
              defaultCountry="FR"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonEditForm;
