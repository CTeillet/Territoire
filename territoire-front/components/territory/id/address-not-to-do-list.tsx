import {Address} from "@/models/address";

const AddressNotToDoList = ({ addresses }: { addresses: Address[] }) => {
    if (!addresses || addresses.length === 0) return null;

    return (
        <div className="mt-6 border border-gray-200 bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-2">🚫 Addresses à ne pas visiter</h2>
            <ul>
                {addresses.map((address, index) => (
                    <li key={index} className="p-2 border-b">
                        {address.street}, {address.number} - {address.zipCode} {address.city}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default AddressNotToDoList;
