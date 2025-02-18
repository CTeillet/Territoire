import {Plus} from "lucide-react";
import React from "react";

type PlusButtonProps = {
    onClick: React.MouseEventHandler<HTMLButtonElement>;
};

const PlusButton: React.FC<PlusButtonProps> = ({ onClick }) => (
    <button
        onClick={onClick}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
    >
        <Plus/>
    </button>
);

export default PlusButton;
