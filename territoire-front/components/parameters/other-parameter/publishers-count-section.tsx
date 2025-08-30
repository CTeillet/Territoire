"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/utils/auth-fetch";
import { toast } from "sonner";

export const PublishersCountSection = () => {
  const [value, setValue] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch("/api/settings/publishers-count");
        if (res.ok) {
          const c = await res.json();
          setValue(String(typeof c === "number" ? c : 0));
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const onSave = async () => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Veuillez saisir un nombre valide de proclamateurs");
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/api/settings/publishers-count", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (res.ok) {
        toast.success("Nombre de proclamateurs enregistré");
      } else {
        toast.error("Échec de l'enregistrement du nombre de proclamateurs");
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Paramètres généraux</h2>
      <div className="flex items-center gap-3">
        <label className="min-w-64">Nombre de proclamateurs</label>
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-40"
        />
        <Button onClick={onSave} disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
};
