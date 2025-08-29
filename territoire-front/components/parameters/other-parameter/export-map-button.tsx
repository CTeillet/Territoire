"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils"; // si tu as ce helper, sinon retire-le
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {authFetch} from "@/utils/auth-fetch";

type Paper = "A4" | "A3";
type Orientation = "portrait" | "landscape";

type Props = {
    /** Optionnel: pour filtrer la carte sur une ville */
    cityId?: string; // UUID
    className?: string;
};

export const ExportTerritoriesMapButton: React.FC<Props> = ({ cityId, className }) => {
    const [paper, setPaper] = useState<Paper>("A3");
    const [orientation, setOrientation] = useState<Orientation>("landscape");
    const [dpi, setDpi] = useState<number>(300);
    const [zoom, setZoom] = useState<number>(14);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const filename = useMemo(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const citySuffix = cityId ? `_city-${cityId.slice(0, 8)}` : "";
        return `territoires_${paper}_${orientation}_${dpi}dpi_z${zoom}${citySuffix}_${yyyy}-${mm}-${dd}.png`;
    }, [paper, orientation, dpi, zoom, cityId]);

    const downloadPng = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                paper,
                orientation,
                dpi: String(dpi),
                zoom: String(zoom),
            });
            if (cityId) params.set("cityId", cityId);

            // 👉 adapte le chemin si ton back est sur un autre host (ex: via /api proxy)
            // ex: "/api/exports/territories.png?..."
            const url = `/api/exports/territories.png?${params.toString()}`;
            const res = await authFetch(url);

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`HTTP ${res.status} — ${text || "échec du rendu"}`);
            }

            const blob = await res.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = objectUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(objectUrl);
        } catch (e) {
            console.error("Export PNG échoué:", e);
            // Optionnel: affiche un toast si tu utilises sonner
            // toast.error("Échec de l’export: " + (e as Error).message);
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <h2 className="text-lg font-semibold">Exporter</h2>

            <div className="flex items-center gap-2">
                <Button onClick={downloadPng} disabled={loading} className="flex items-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-5 w-5" />}
                    {loading ? "Génération…" : "Exporter la carte"}
                </Button>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4" /> Options
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[520px]">
                        <DialogHeader>
                            <DialogTitle>Options d’export</DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-4 py-2">
                            <div className="flex flex-col gap-2">
                                <Label>Format</Label>
                                <Select value={paper} onValueChange={(v) => setPaper(v as Paper)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="A4">A4</SelectItem>
                                        <SelectItem value="A3">A3</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Orientation</Label>
                                <Select value={orientation} onValueChange={(v) => setOrientation(v as Orientation)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="portrait">Portrait</SelectItem>
                                        <SelectItem value="landscape">Paysage</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>DPI</Label>
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    min={72}
                                    max={600}
                                    value={dpi}
                                    onChange={(e) => setDpi(Number(e.target.value || 300))}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label>Zoom tuiles</Label>
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    min={10}
                                    max={18}
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value || 14))}
                                />
                            </div>

                            {cityId && (
                                <div className="col-span-2 text-sm text-muted-foreground">
                                    Filtré sur <span className="font-medium">cityId</span> = {cityId}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button onClick={downloadPng} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Lancer l’export
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <p className="text-xs text-muted-foreground">
                Fichier: <span className="font-mono">{filename}</span>
            </p>
        </div>
    );
};
