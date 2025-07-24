import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  title?: string;
  description?: string;
  showHelp?: boolean;
}

export function EmptyState({
  title = "Aucun territoire en retard",
  description = "Tous les territoires sont à jour. Revenez plus tard pour vérifier.",
  showHelp = true
}: EmptyStateProps) {
  return (
    <Card className="shadow-md border-0">
      <CardContent className="flex flex-col items-center justify-center h-80 py-12">
        <CheckCircle2 className="h-20 w-20 text-green-500 mb-6" />
        <h3 className="text-2xl font-semibold mb-3">
          {title}
        </h3>
        <p className="text-gray-500 text-center text-lg mb-6 max-w-md">
          {description}
        </p>

        {showHelp && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4 max-w-md">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-blue-700 mb-2">
                  Les territoires sont marqués comme &quot;en retard&quot; lorsque leur date d&apos;échéance est dépassée.
                </p>
                <p className="text-sm text-blue-700">
                  Vous pouvez consulter tous les territoires et leurs statuts sur la page des territoires.
                </p>
                <div className="mt-4">
                  <Link href="/territoires">
                    <Button variant="outline" size="sm" className="text-blue-600 border-blue-300 hover:bg-blue-50">
                      Voir tous les territoires
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
