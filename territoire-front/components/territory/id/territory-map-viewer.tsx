"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TriangleAlert } from "lucide-react";
import { authFetch } from "@/utils/auth-fetch";

interface TerritoryMapViewerProps {
  territoryMapId: string;
  /** Boutons à droite du titre (génération de la carte physique). */
  actions?: React.ReactNode;
}

const TerritoryMapViewer: React.FC<TerritoryMapViewerProps> = ({
  territoryMapId,
  actions,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Utiliser authFetch pour récupérer l'image avec authentification
  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        const response = await authFetch(
          `/api/territoires/${territoryMapId}/carte`
        );

        if (!response.ok) {
          console.error(
            "❌ Erreur lors de la récupération de la carte du territoire"
          );
          setHasError(true);
          setIsLoading(false);
          return;
        }

        // Récupérer les données binaires de l'image
        const blob = await response.blob();

        // Créer une URL pour le blob
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (error) {
        console.error(
          "❌ Erreur lors de la récupération de la carte du territoire:",
          error
        );
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();

    // Nettoyer l'URL de l'objet lors du démontage du composant
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [territoryMapId]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carte du territoire</CardTitle>
        {actions && <CardAction>{actions}</CardAction>}
      </CardHeader>
      <CardContent className="flex justify-center">
        <div className="relative w-full h-[500px] border border-border rounded-md overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}
          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-4 text-center">
              <TriangleAlert
                aria-hidden="true"
                className="mb-2 h-6 w-6 text-destructive"
              />
              <p className="text-foreground">
                Impossible de charger l&apos;image. Veuillez réessayer plus
                tard.
              </p>
            </div>
          )}
          {imageUrl && (
            // Image chargée par authFetch (en-tête Authorization) puis servie en blob: : rien à optimiser pour next/image
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Carte du territoire"
              className="object-contain w-full h-full"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ display: hasError ? "none" : "block" }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TerritoryMapViewer;
