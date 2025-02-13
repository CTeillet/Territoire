import { Button } from "@/components/ui/button";
import Link from "next/link";
import {Ban, Edit, Save, Undo2} from "lucide-react";
import {PersonActionsProps} from "@/models/person-action-props";

const PersonActions = ({ editing, onEdit, onSave, onCancel }: PersonActionsProps) => {
    return (
        <div className="flex gap-4">
            {editing ? (
                <>
                    <Button className="bg-green-500" onClick={onSave}><Save/></Button>
                    <Button className="bg-gray-500" onClick={onCancel}><Ban/></Button>
                </>
            ) : (
                <Button onClick={onEdit}><Edit/></Button>
            )}
            <Link href="/personnes">
                <Button className="bg-gray-500"><Undo2/></Button>
            </Link>
        </div>
    );
};

export default PersonActions;
