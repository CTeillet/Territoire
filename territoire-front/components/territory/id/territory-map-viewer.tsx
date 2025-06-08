"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/utils/auth-fetch";

interface TerritoryMapViewerProps {
    territoryMapId: string;
}

const TerritoryMapViewer: React.FC<TerritoryMapViewerProps> = ({ territoryMapId }) => {
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

                const response = await authFetch(`/api/territoires/${territoryMapId}/carte`);

                if (!response.ok) {
                    console.error('❌ Erreur lors de la récupération de la carte du territoire');
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
                console.error('❌ Erreur lors de la récupération de la carte du territoire:', error);
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
        <Card className="mb-6 max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center">
                    <span className="mr-2">🗺️</span> Carte du territoire
                </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
                <div className="relative w-full h-[500px] border border-gray-200 rounded-md overflow-hidden">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    )}
                    {hasError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
                            <div className="text-red-500 text-xl mb-2">⚠️</div>
                            <p className="text-gray-700">Impossible de charger l&apos;image. Veuillez réessayer plus tard.</p>
                        </div>
                    )}
                    {imageUrl && (
                        <img 
                            src={imageUrl}
                            alt="Carte du territoire"
                            className="object-contain w-full h-full"
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                            style={{ display: hasError ? 'none' : 'block' }}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default TerritoryMapViewer;
