import {
  CalendarIcon,
  CheckIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TerritoryStatus } from "@/models/territory-status";
import { TYPE_TRANSLATIONS, TerritoryType } from "@/models/territory-type";
import { TerritoryDataActionButtons } from "@/components/shared/territory-data-action-buttons";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import {
  deleteTerritory,
  updateTerritory,
} from "@/store/slices/territory-slice";
import { fetchCities } from "@/store/slices/city-slice";
import { UpdateTerritoryDto } from "@/models/update-territory-dto";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { TerritoryStatusBadge } from "@/components/territory/territory-status-badge";
import { LostBadge } from "@/components/territory/lost-badge";

interface TerritoryHeaderProps {
  territoryId: string;
  name: string;
  city: string;
  status: TerritoryStatus;
  type?: TerritoryType;
  lastModifiedDate: string | null;
  note?: string | null;
  territoryMapId?: string;
  lost?: boolean;
}

const TerritoryHeader = ({
  name,
  city,
  status,
  type,
  lastModifiedDate,
  note,
  territoryId,
  territoryMapId,
  lost = false,
}: TerritoryHeaderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const cities = useSelector((state: RootState) => state.cities.cities);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // États pour l'édition
  const [tempName, setTempName] = useState(name);
  const [tempNote, setTempNote] = useState(note ?? "");
  const [tempCityId, setTempCityId] = useState<string | undefined>(undefined);
  const [tempType, setTempType] = useState<TerritoryType | undefined>(type);
  const [isEditing, setIsEditing] = useState(false);

  // Charger les villes au montage du composant
  useEffect(() => {
    dispatch(fetchCities());
  }, [dispatch]);

  // Sauvegarde des modifications
  const handleSave = () => {
    const dto: UpdateTerritoryDto = {
      name: tempName,
      note: tempNote,
      cityId: tempCityId,
      type: tempType,
    };
    dispatch(
      updateTerritory({
        id: territoryId,
        dto,
      })
    );
    setIsEditing(false);
  };

  const handleDelete = () => {
    dispatch(deleteTerritory(territoryId)).then((action) => {
      if (deleteTerritory.fulfilled.match(action)) {
        router.push("/territoires"); // ✅ Redirige après suppression réussie
      }
    });
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
      {/* Nom et édition */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center">
          {isEditing ? (
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="w-full"
            />
          ) : (
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 break-words">
              {name}
            </h1>
          )}
        </div>

        {/* Boutons d'édition et validation */}
        {user?.role === "ADMIN" || user?.role === "SUPERVISEUR" ? (
          // Mêmes boutons libellés que sur la fiche d'une personne
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  aria-label="Enregistrer les modifications"
                  onClick={handleSave}
                >
                  <CheckIcon aria-hidden="true" />
                  Enregistrer
                </Button>
                <Button
                  variant="outline"
                  aria-label="Annuler les modifications"
                  onClick={() => setIsEditing(false)}
                >
                  <XIcon aria-hidden="true" />
                  Annuler
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  aria-label="Modifier le territoire"
                  onClick={() => setIsEditing(true)}
                >
                  <PencilIcon aria-hidden="true" />
                  Modifier
                </Button>
                <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive-outline"
                      aria-label="Supprimer le territoire"
                    >
                      <TrashIcon aria-hidden="true" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Supprimer ce territoire ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Le territoire sera
                        définitivement supprimé.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleDelete}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        ) : (
          <></>
        )}
      </div>

      {/* Ville modifiable */}
      <div className="text-gray-700 flex items-center mb-2">
        <MapPinIcon
          aria-hidden="true"
          className="mr-2 h-4 w-4 shrink-0 text-muted-foreground"
        />
        <span className="font-semibold mr-2 flex-shrink-0">Ville :</span>
        <div className="flex-grow min-w-0">
          {isEditing ? (
            <Select onValueChange={setTempCityId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={city} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((cityItem) => (
                  <SelectItem key={cityItem.id} value={cityItem.id}>
                    {cityItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="truncate">{city}</span>
          )}
        </div>
      </div>

      {/* Statut */}
      <p className="text-gray-700 flex items-center mb-2">
        <span className="font-semibold">Statut :</span>
        <TerritoryStatusBadge status={status} className="ml-2" />
        {lost && <LostBadge className="ml-2" />}
      </p>

      {/* Type */}
      <div className="text-gray-700 flex items-center mb-2">
        <span className="font-semibold">Type :</span>
        {isEditing ? (
          <Select
            value={tempType}
            onValueChange={(value) => setTempType(value as TerritoryType)}
          >
            <SelectTrigger className="w-40 ml-2">
              <SelectValue placeholder="Sélectionner un type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUILDING">Immeuble</SelectItem>
              <SelectItem value="HOUSE">Pavillon</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="ml-2">{type ? TYPE_TRANSLATIONS[type] : "-"}</span>
        )}
      </div>

      {/* Dernière modification */}
      {lastModifiedDate && (
        <p className="mb-1 flex items-center text-sm text-muted-foreground">
          <CalendarIcon aria-hidden="true" className="mr-2 h-4 w-4" />
          Dernière modification : {lastModifiedDate}
        </p>
      )}

      {/* Note modifiable */}
      <div className="mt-6 rounded-md bg-muted p-3">
        <h3 className="font-semibold">Note :</h3>
        {isEditing ? (
          <Input
            value={tempNote}
            onChange={(e) => setTempNote(e.target.value)}
            className="w-full"
          />
        ) : (
          <p className="text-gray-700">{note || "Aucune note"}</p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6">
        <TerritoryDataActionButtons
          className="justify-start"
          territoryId={territoryId}
          showDetails={false}
          status={status}
          territoryMapId={territoryMapId}
          lost={lost}
        />
      </div>
    </div>
  );
};

export default TerritoryHeader;
