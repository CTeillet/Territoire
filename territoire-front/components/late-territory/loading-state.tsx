import React from "react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Chargement des territoires en retard..." }: LoadingStateProps) {
  return (
    <div className="flex justify-center items-center h-64">
      <p>{message}</p>
    </div>
  );
}