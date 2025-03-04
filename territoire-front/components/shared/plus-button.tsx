import {Plus} from "lucide-react";
import React from "react";
import {Button} from "@/components/ui/button";

type PlusButtonProps = {
    onClick: React.MouseEventHandler<HTMLButtonElement>;
};

const PlusButton: React.FC<PlusButtonProps> = ({ onClick }) => (
    <Button
        onClick={onClick}
        className="px-4 py-2 rounded-lg shadow "
    >
        <Plus/>
    </Button>
);

export default PlusButton;
