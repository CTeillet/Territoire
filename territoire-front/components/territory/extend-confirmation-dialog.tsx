import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addMonths, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtendConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (dueDate?: string) => void;
}

type ExtensionOption = "4months" | "1month" | "1week" | "custom";

const ExtendConfirmationDialog: React.FC<ExtendConfirmationDialogProps> = ({ isOpen, onClose, onConfirm }) => {
    const [selectedOption, setSelectedOption] = useState<ExtensionOption>("4months");
    const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
    const [calendarOpen, setCalendarOpen] = useState(false);

    const handleConfirm = () => {
        let dueDate: string | undefined;

        switch (selectedOption) {
            case "4months":
                dueDate = format(addMonths(new Date(), 4), "yyyy-MM-dd");
                break;
            case "1month":
                dueDate = format(addMonths(new Date(), 1), "yyyy-MM-dd");
                break;
            case "1week":
                dueDate = format(addWeeks(new Date(), 1), "yyyy-MM-dd");
                break;
            case "custom":
                dueDate = customDate ? format(customDate, "yyyy-MM-dd") : undefined;
                break;
        }

        onConfirm(dueDate);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Prolongation du territoire</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p>Choisissez la durée de prolongation :</p>

                    <RadioGroup value={selectedOption} onValueChange={(value) => setSelectedOption(value as ExtensionOption)}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="4months" id="4months" />
                            <Label htmlFor="4months">4 mois</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="1month" id="1month" />
                            <Label htmlFor="1month">1 mois</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="1week" id="1week" />
                            <Label htmlFor="1week">1 semaine</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="custom" />
                            <Label htmlFor="custom">Personnalisé</Label>
                        </div>
                    </RadioGroup>

                    {selectedOption === "custom" && (
                        <div className="flex flex-col space-y-2">
                            <Label htmlFor="customDate">Date de fin personnalisée :</Label>
                            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="customDate"
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !customDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {customDate ? format(customDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={customDate}
                                        onSelect={(date) => {
                                            setCustomDate(date);
                                            setCalendarOpen(false);
                                        }}
                                        initialFocus
                                        disabled={(date) => date < new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={handleConfirm}
                        disabled={selectedOption === "custom" && !customDate}
                    >
                        Confirmer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ExtendConfirmationDialog;
