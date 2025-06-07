import { Person } from "@/models/person";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "@/store/store";
import { fetchAssignedTerritories } from "@/store/slices/person-slice";
import PersonInfoCard from "./person-info-card";
import AssignedTerritoriesList from "./assigned-territories-list";

interface PersonDetailsProps {
    person: Person;
}

const PersonDetails = ({ person }: PersonDetailsProps) => {
    const dispatch = useAppDispatch();
    const { assignedTerritories, loadingAssignedTerritories } = useSelector((state: RootState) => state.persons);

    useEffect(() => {
        if (person.id) {
            dispatch(fetchAssignedTerritories(person.id));
        }
    }, [dispatch, person.id]);

    return (
        <div className="space-y-6">
            <PersonInfoCard person={person} />
            <AssignedTerritoriesList 
                assignedTerritories={assignedTerritories} 
                loadingAssignedTerritories={loadingAssignedTerritories} 
            />
        </div>
    );
};

export default PersonDetails;
