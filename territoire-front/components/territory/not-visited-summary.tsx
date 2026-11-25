import React, { useMemo } from "react";
import { StatCard } from "@/components/shared/ui/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toneMark } from "@/components/shared/tones";
import { Territory } from "@/models/territory";
import { SchoolYearPeriod } from "@/models/school-year-period";
import { TYPE_TRANSLATIONS } from "@/models/territory-type";
import { territoryCityName } from "@/lib/territory-suggestion";
import { formatDay, formatLongDay, lastVisitDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Coverage = { label: string; total: number; remaining: number };

const percent = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 100;

/** Territoires et non parcourus de chaque groupe (ville, type) : ceux où il reste le plus à faire d'abord. */
function coverageBy(
  territories: readonly Territory[],
  notVisitedIds: ReadonlySet<string>,
  groupOf: (territory: Territory) => string | undefined
): Coverage[] {
  const groups = new Map<string, Coverage>();
  for (const territory of territories) {
    const label = groupOf(territory);
    if (!label) continue;
    const group = groups.get(label) ?? { label, total: 0, remaining: 0 };
    group.total++;
    if (notVisitedIds.has(territory.id)) group.remaining++;
    groups.set(label, group);
  }
  return [...groups.values()].sort(
    (a, b) => b.remaining - a.remaining || a.label.localeCompare(b.label, "fr")
  );
}

/** Part des territoires déjà parcourus, et ce qu'il reste. */
function CoverageBar({ label, total, remaining }: Coverage) {
  const visited = total - remaining;
  const visitedPercent = percent(visited, total);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {remaining > 0 ? `${remaining} à parcourir` : "Tout parcouru"} ·{" "}
          {visitedPercent} %
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} : territoires parcourus`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={visited}
        aria-valuetext={`${visited} sur ${total}`}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full", toneMark.success)}
          style={{ width: `${visitedPercent}%` }}
        />
      </div>
    </div>
  );
}

function CoverageGroup({
  title,
  groups,
}: {
  title: string;
  groups: Coverage[];
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {groups.map((group) => (
        <CoverageBar key={group.label} {...group} />
      ))}
    </section>
  );
}

interface NotVisitedSummaryProps {
  /** Tous les territoires en service. */
  territories: readonly Territory[];
  /** Ceux qui n'ont pas été parcourus pendant la période. */
  notVisited: readonly Territory[];
  period: SchoolYearPeriod;
}

/** Où en est la période : ce qu'il reste à parcourir, en tout, par ville et par type. */
export function NotVisitedSummary({
  territories,
  notVisited,
  period,
}: NotVisitedSummaryProps) {
  const notVisitedIds = useMemo(
    () => new Set(notVisited.map((territory) => territory.id)),
    [notVisited]
  );
  const byCity = useMemo(
    () => coverageBy(territories, notVisitedIds, territoryCityName),
    [territories, notVisitedIds]
  );
  const byType = useMemo(
    () =>
      coverageBy(territories, notVisitedIds, (territory) =>
        territory.type ? TYPE_TRANSLATIONS[territory.type] : undefined
      ),
    [territories, notVisitedIds]
  );

  const lastVisits = notVisited.map((territory) =>
    lastVisitDate(territory.lastVisitedOn)
  );
  const neverVisited = lastVisits.filter((date) => date === null).length;
  const oldestVisit = lastVisits
    .filter((date): date is string => date !== null)
    .sort()[0];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title={
            period.current
              ? `À parcourir avant le ${formatLongDay(period.endDate)}`
              : `Non parcourus en ${period.label}`
          }
          value={`${notVisited.length} sur ${territories.length}`}
        />
        <StatCard title="Jamais parcourus" value={neverVisited} />
        <StatCard
          title="Plus ancien parcours"
          value={oldestVisit ? formatDay(oldestVisit) : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avancement</CardTitle>
          <CardDescription>
            {period.current
              ? `Territoires parcourus depuis le ${formatLongDay(period.startDate)}`
              : `Territoires parcourus du ${formatLongDay(period.startDate)} au ${formatLongDay(period.endDate)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CoverageBar
            label="Tous les territoires"
            total={territories.length}
            remaining={notVisited.length}
          />
          {/* Une seule ville ou un seul type : la barre générale dit déjà tout */}
          {(byCity.length > 1 || byType.length > 1) && (
            <div className="grid gap-6 md:grid-cols-2">
              {byCity.length > 1 && (
                <CoverageGroup title="Par ville" groups={byCity} />
              )}
              {byType.length > 1 && (
                <CoverageGroup title="Par type" groups={byType} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
