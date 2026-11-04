"use client";

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { createPerson, fetchPersons } from "@/store/slices/person-slice";
import PersonList from "@/components/person/person-list";
import CreatePersonDialog from "@/components/person/create-person-dialog";
import { Person } from "@/models/person";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  LoadingState,
  PageContainer,
  PageHeader,
} from "@/components/shared/page-layout";

const PersonsPage = () => {
  const dispatch = useAppDispatch();
  const { persons, loading, creating } = useAppSelector(
    (state) => state.persons
  );
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirection si l'utilisateur n'est pas authentifié
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Toujours exécuter ce hook avant toute condition
  useEffect(() => {
    dispatch(fetchPersons());
  }, [dispatch]);

  // Affichage temporaire pour éviter un écran blanc avant la redirection
  if (!isAuthenticated) {
    return <p>Redirection en cours...</p>;
  }

  const handleCreatePerson = async (person: Person) => {
    // unwrap : un échec doit remonter au dialogue (sinon il afficherait un succès)
    await dispatch(createPerson(person)).unwrap();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Personnes"
        actions={
          <CreatePersonDialog
            onCreate={handleCreatePerson}
            isLoading={creating}
          />
        }
      />
      {loading ? <LoadingState /> : <PersonList persons={persons} />}
    </PageContainer>
  );
};

export default PersonsPage;
