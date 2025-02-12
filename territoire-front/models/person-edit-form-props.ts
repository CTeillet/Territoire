interface PersonEditFormProps {
    formData: {
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber: string;
    };
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
