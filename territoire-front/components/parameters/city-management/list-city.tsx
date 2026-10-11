import React, { useEffect } from "react";
import { City } from "@/models/city";
import { useAppDispatch } from "@/store/store";
import {
  fetchCities,
  removeCity,
  updateCityColor,
} from "@/store/slices/city-slice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const ListCity = ({ cities }: { cities: City[] }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchCities());
  }, [dispatch]);

  // Le serveur refuse de supprimer une ville qui contient encore des territoires
  const handleRemoveCity = async (id: string) => {
    const result = await dispatch(removeCity(id));
    if (removeCity.rejected.match(result)) {
      toast.error(result.error.message ?? "Erreur lors de la suppression");
    }
  };

  const handleColorChange = async (id: string, colorHex: string) => {
    const result = await dispatch(updateCityColor({ id, colorHex }));
    if (updateCityColor.rejected.match(result)) {
      toast.error(
        result.error.message ?? "Erreur lors du changement de couleur"
      );
    }
  };

  return (
    <Card className="shadow-lg border border-gray-200">
      <CardHeader>
        <CardTitle>Liste des villes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Nom</TableHead>
              <TableHead className="w-1/4 text-center">Couleur</TableHead>
              <TableHead className="w-1/4 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cities.map((city) => (
              <TableRow key={city.id}>
                <TableCell className="flex items-center gap-3">
                  <span
                    className="inline-block w-4 h-4 rounded-full border"
                    style={{ backgroundColor: city.colorHex || "#cccccc" }}
                    title={city.colorHex || "#cccccc"}
                  />
                  {city.name}
                </TableCell>
                <TableCell className="text-center">
                  <input
                    type="color"
                    value={city.colorHex || "#cccccc"}
                    onChange={(e) => handleColorChange(city.id, e.target.value)}
                    className="w-10 h-10 p-0 border rounded"
                    aria-label={`Choisir couleur pour ${city.name}`}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCity(city.id)}
                    aria-label={`Supprimer ${city.name}`}
                  >
                    <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ListCity;
