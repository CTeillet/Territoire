"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
// Using the Campaign type from the Redux state
import { useAppDispatch, useAppSelector } from "@/store/store";
import { 
  fetchCampaigns, 
  createCampaign, 
  createCampaignWithRemainingTerritories 
} from "@/store/slices/campaign-slice";

interface CreateCampaignDialogProps {
  onCampaignCreated?: () => void;
}

export function CreateCampaignDialog({ onCampaignCreated }: CreateCampaignDialogProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { campaigns, loading, error } = useAppSelector(state => state.campaigns);

  const [open, setOpen] = useState(false);
  const [selectedPreviousCampaign, setSelectedPreviousCampaign] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  // Filtered closed campaigns with remaining territories
  const closedCampaigns = campaigns.filter(campaign => 
    campaign.closed && campaign.remainingTerritories.length > 0
  );

  // Fetch campaigns when the dialog opens
  useEffect(() => {
    if (open) {
      dispatch(fetchCampaigns());
    }
  }, [open, dispatch]);

  // Show error toast if there's an error in the Redux state
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Le nom de la campagne est requis");
      return;
    }

    if (!formData.startDate) {
      toast.error("La date de début est requise");
      return;
    }

    if (!formData.endDate) {
      toast.error("La date de fin est requise");
      return;
    }

    // Vérifier que la date de fin est après la date de début
    if (formData.startDate && formData.endDate < formData.startDate) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }

    try {
      let campaign;
      let successMessage = `La campagne "${formData.name}" a été créée avec succès.`;

      // Si une campagne précédente est sélectionnée, utiliser le thunk avec territoires restants
      if (selectedPreviousCampaign) {
        campaign = await dispatch(createCampaignWithRemainingTerritories({
          previousCampaignId: selectedPreviousCampaign,
          newCampaign: formData
        })).unwrap();

        successMessage = `La campagne "${formData.name}" a été créée avec succès avec les territoires restants de la campagne précédente.`;
      } else {
        // Sinon, utiliser le thunk standard
        campaign = await dispatch(createCampaign(formData)).unwrap();
      }

      toast.success(successMessage);

      // Close the dialog
      setOpen(false);

      // Reset the form
      resetForm();

      // Call the callback if provided
      if (onCampaignCreated) {
        onCampaignCreated();
      }

      // Navigate to the campaign detail page
      router.push(`/campagnes/${campaign.id}`);
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error("Une erreur est survenue lors de la création de la campagne");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="px-5 py-2.5 text-base font-medium h-auto">
          <Plus className="mr-2 h-5 w-5" />
          Nouvelle campagne
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] p-6">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold">Créer une nouvelle campagne</DialogTitle>
          <DialogDescription className="mt-2 text-base">
            Créez une nouvelle campagne d&apos;invitation pour gérer les assignations de territoires
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-base font-medium">Nom de la campagne</Label>
            <Input
              id="name"
              name="name"
              placeholder="Campagne d'été 2025"
              value={formData.name}
              onChange={handleChange}
              required
              className="h-11 text-base"
            />
          </div>

          {closedCampaigns.length > 0 && (
            <div className="space-y-3">
              <Label htmlFor="previousCampaign" className="text-base font-medium">
                Utiliser les territoires restants d&apos;une campagne précédente (optionnel)
              </Label>
              <p className="text-sm text-gray-500">
                Sélectionnez une campagne précédente pour utiliser ses territoires restants dans cette nouvelle campagne.
              </p>
              <Select
                value={selectedPreviousCampaign || "none"}
                onValueChange={(value) => setSelectedPreviousCampaign(value === "none" ? null : value)}
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="Sélectionner une campagne précédente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" key="none">Aucune campagne précédente</SelectItem>
                  {closedCampaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.remainingTerritories.length} territoires)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="startDate" className="text-base font-medium">Date de début</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="endDate" className="text-base font-medium">Date de fin</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                required
                className="h-11 text-base"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="description" className="text-base font-medium">Description (optionnelle)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Décrivez l'objectif de cette campagne..."
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="min-h-[120px] resize-y text-base p-3"
            />
          </div>

          <DialogFooter className="pt-6 gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)} 
              className="px-5 py-2.5 text-base font-medium h-auto"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="px-5 py-2.5 text-base font-medium h-auto"
            >
              {loading ? "Création en cours..." : "Créer la campagne"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
