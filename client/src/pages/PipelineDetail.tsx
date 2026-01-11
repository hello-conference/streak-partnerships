import { Shell } from "@/components/layout/Shell";
import { usePipeline, usePipelineBoxes, usePipelines } from "@/hooks/use-pipelines";
import { useRoute } from "wouter";
import { BoxList } from "@/components/pipelines/BoxList";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Filter, Search } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PipelineDetail() {
  const [match, params] = useRoute("/pipelines/:key");
  const key = match ? params.key : null;
  const { data: pipeline, isLoading: isPipelineLoading } = usePipeline(key);
  const { data: boxes, isLoading: isBoxesLoading } = usePipelineBoxes(key);
  const { data: allPipelines, isLoading: isPipelinesLoading } = usePipelines();
  
  const [search, setSearch] = useState("");

  const prevYearPipelineKey = useMemo(() => {
    if (!allPipelines || !pipeline) return null;
    // Extract the country code from current pipeline (e.g., "Partners 2026 BE" -> "BE")
    const currentName = pipeline.name || "";
    const countryMatch = currentName.match(/Partners \d{4} (\w+)$/);
    if (!countryMatch) return null;
    const country = countryMatch[1];
    // Find previous year pipeline for same country
    const prevYearPipeline = allPipelines.find(p => p.name === `Partners 2025 ${country}`);
    return prevYearPipeline?.key || null;
  }, [allPipelines, pipeline]);

  const { data: prevYearBoxes } = usePipelineBoxes(prevYearPipelineKey);

  const getPartnershipCardColor = (partnership: string): string => {
    switch (partnership) {
      case "Ultimate":
        return "bg-amber-950/20 border border-amber-600/30";
      case "Platinum":
        return "bg-slate-600/10 border border-slate-400/30";
      case "Gold":
        return "bg-yellow-600/10 border border-yellow-500/30";
      case "Silver":
        return "bg-gray-400/10 border border-gray-400/30";
      default:
        return "bg-muted/40";
    }
  };

  if (isPipelineLoading || isBoxesLoading || isPipelinesLoading) {
    return (
      <Shell>
        <LoadingSpinner />
      </Shell>
    );
  }

  if (!pipeline) {
    return (
      <Shell>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Pipeline not found</h2>
          <Link href="/" className="text-primary hover:underline mt-4 inline-block">Return Home</Link>
        </div>
      </Shell>
    );
  }

  const filteredBoxes = boxes?.filter(box => 
    box.name.toLowerCase().includes(search.toLowerCase()) || 
    (box.notes && box.notes.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const getPartnershipValue = (box: any): string | null => {
    if (box.fields?.["1001_resolved"]) {
      return box.fields["1001_resolved"];
    }
    if (box.fields?.["1001"]) {
      const val = box.fields["1001"];
      if (typeof val === "string") {
        const fieldMap: Record<string, string> = {
          "9001": "Ultimate",
          "9002": "Platinum", 
          "9003": "Gold",
          "9004": "Silver"
        };
        if (fieldMap[val]) return fieldMap[val];
      }
    }
    return null;
  };

  const getPrice = (box: any): number | null => {
    const priceField = box.fields?.["1003"];
    if (priceField && typeof priceField === "object" && priceField.calculationValue) {
      return priceField.calculationValue;
    }
    return null;
  };

  // Calculate confirmed partnerships stats
  const confirmedStats: Record<string, { count: number; total: number }> = {};
  let totalConfirmedRevenue = 0;

  filteredBoxes.forEach((box: any) => {
    const partnership = getPartnershipValue(box);
    if (partnership) {
      if (!confirmedStats[partnership]) {
        confirmedStats[partnership] = { count: 0, total: 0 };
      }
      confirmedStats[partnership].count += 1;
      const price = getPrice(box);
      if (price) {
        confirmedStats[partnership].total += price;
        totalConfirmedRevenue += price;
      }
    }
  });

  // Calculate previous year stats for comparison
  const prevYearStats: Record<string, { count: number; total: number }> = {};
  let totalPrevYearRevenue = 0;

  if (prevYearBoxes && prevYearBoxes.length > 0) {
    prevYearBoxes.forEach((box: any) => {
      const partnership = getPartnershipValue(box);
      if (partnership) {
        if (!prevYearStats[partnership]) {
          prevYearStats[partnership] = { count: 0, total: 0 };
        }
        prevYearStats[partnership].count += 1;
        const price = getPrice(box);
        if (price) {
          prevYearStats[partnership].total += price;
          totalPrevYearRevenue += price;
        }
      }
    });
  }

  const formatEuro = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        {/* Header Navigation */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Pipeline Info Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2" data-testid="text-pipeline-title">{pipeline.name}</h1>
            <p className="text-muted-foreground max-w-2xl">Manage your deals and track progress compared to the partnerships in 2025.</p>
          </div>
        </div>

        {/* Partnership Stats Cards */}
        {Object.keys(confirmedStats).length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {["Ultimate", "Platinum", "Gold", "Silver"].map((partnership) => {
                const stats = confirmedStats[partnership];
                const prevStats = prevYearStats[partnership];
                if (!stats) return null;

                const countDiff = prevStats ? stats.count - prevStats.count : 0;
                const revenueDiff = prevStats ? stats.total - prevStats.total : 0;

                return (
                  <Card key={partnership} className={`p-3 ${getPartnershipCardColor(partnership)}`}>
                    <div className="text-xs font-medium text-muted-foreground mb-2">{partnership}</div>
                    
                    {/* Partner Count */}
                    <div className="mb-2">
                      <div className="text-lg font-bold text-foreground">{stats.count}</div>
                      {prevStats && (
                        <div className="text-xs text-muted-foreground/70 mt-0.5">
                          2025: {prevStats.count} {countDiff !== 0 && (
                            <span className={countDiff > 0 ? 'text-green-600' : 'text-red-600'}>
                              {countDiff > 0 ? '+' : ''}{countDiff}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Revenue */}
                    <div className="text-xs text-muted-foreground">
                      <div>{formatEuro(stats.total)}</div>
                      {prevStats && (
                        <div className="text-xs text-muted-foreground/70 mt-0.5">
                          2025: {formatEuro(prevStats.total)} {revenueDiff !== 0 && (
                            <span className={revenueDiff > 0 ? 'text-green-600' : 'text-red-600'}>
                              {revenueDiff > 0 ? '+' : ''}{formatEuro(revenueDiff)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
              <Card className="p-3 bg-primary/10 border border-primary/20">
                <div className="text-xs font-medium text-primary mb-2">Total Revenue</div>
                <div className="text-lg font-bold text-primary">{formatEuro(totalConfirmedRevenue)}</div>
                {totalPrevYearRevenue > 0 && (
                  <div className="text-xs text-primary/70 mt-1">
                    2025: {formatEuro(totalPrevYearRevenue)} {totalConfirmedRevenue - totalPrevYearRevenue !== 0 && (
                      <span className={totalConfirmedRevenue - totalPrevYearRevenue > 0 ? 'text-green-600' : 'text-red-600'}>
                        {totalConfirmedRevenue - totalPrevYearRevenue > 0 ? '+' : ''}{formatEuro(Math.abs(totalConfirmedRevenue - totalPrevYearRevenue))}
                      </span>
                    )}
                  </div>
                )}
              </Card>
            </div>
            <Separator className="my-4" />
          </>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search boxes..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <Button variant="outline" className="gap-2 shrink-0">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>

        {/* Content */}
        <div className="mt-2">
          <h2 className="text-lg font-semibold mb-4">Partnership Sections</h2>
          <BoxList boxes={filteredBoxes} pipeline={pipeline} prevYearStats={prevYearStats} />
        </div>
      </div>
    </Shell>
  );
}
