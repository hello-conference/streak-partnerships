import { Shell } from "@/components/layout/Shell";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Building2, MapPin, ArrowRight, Users, Banknote } from "lucide-react";
import { usePipelineBoxes } from "@/hooks/use-pipelines";

const BE_PIPELINE_KEY = "agxzfm1haWxmb29nYWVyMwsSDE9yZ2FuaXphdGlvbiIMdGVjaG9yYW1hLmJlDAsSCFdvcmtmbG93GICApZrW4vgKDA";
const NL_PIPELINE_KEY = "agxzfm1haWxmb29nYWVyMwsSDE9yZ2FuaXphdGlvbiIMdGVjaG9yYW1hLm5sDAsSCFdvcmtmbG93GICAvpeP75gJDA";

const pipelines = [
  {
    id: BE_PIPELINE_KEY,
    name: "Partners 2026 BE",
    country: "Belgium",
    flag: "BE",
    status: "active",
    description: "Manage partnership deals for Techorama Belgium 2026"
  },
  {
    id: NL_PIPELINE_KEY,
    name: "Partners 2026 NL",
    country: "Netherlands",
    flag: "NL",
    status: "active",
    description: "Partnership deals for Techorama Netherlands 2026"
  }
];

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

const formatEuro = (value: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

function calculateStats(boxes: any[] | undefined) {
  const stats = { confirmedCount: 0, totalValue: 0 };
  if (boxes) {
    boxes.forEach((box: any) => {
      const partnership = getPartnershipValue(box);
      if (partnership) {
        stats.confirmedCount += 1;
        const price = getPrice(box);
        if (price) {
          stats.totalValue += price;
        }
      }
    });
  }
  return stats;
}

export default function Dashboard() {
  const { data: beBoxes, isLoading: isBeLoading } = usePipelineBoxes(BE_PIPELINE_KEY);
  const { data: nlBoxes, isLoading: isNlLoading } = usePipelineBoxes(NL_PIPELINE_KEY);

  const beStats = calculateStats(beBoxes);
  const nlStats = calculateStats(nlBoxes);

  return (
    <Shell>
      <div className="flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2" data-testid="text-dashboard-title">
            Techorama Partnership Dashboard
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Select a pipeline to view and manage partnership deals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
          {pipelines.map((pipeline) => (
            pipeline.status === "active" ? (
              <Link key={pipeline.id} href={`/pipelines/${pipeline.id}`}>
                <Card 
                  className="p-6 cursor-pointer hover-elevate transition-all group"
                  data-testid={`card-pipeline-${pipeline.country.toLowerCase()}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg text-foreground">{pipeline.name}</h2>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {pipeline.country}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm text-muted-foreground">{pipeline.description}</p>
                  
                  <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <div>
                        <div className="text-lg font-bold text-foreground" data-testid={`text-${pipeline.flag.toLowerCase()}-confirmed-count`}>
                          {(pipeline.id === BE_PIPELINE_KEY ? isBeLoading : isNlLoading) ? "..." : 
                           (pipeline.id === BE_PIPELINE_KEY ? beStats.confirmedCount : nlStats.confirmedCount)}
                        </div>
                        <div className="text-xs text-muted-foreground">Confirmed Partners</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="text-lg font-bold text-foreground" data-testid={`text-${pipeline.flag.toLowerCase()}-total-value`}>
                          {(pipeline.id === BE_PIPELINE_KEY ? isBeLoading : isNlLoading) ? "..." : 
                           formatEuro(pipeline.id === BE_PIPELINE_KEY ? beStats.totalValue : nlStats.totalValue)}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Value</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      Connected
                    </span>
                  </div>
                </Card>
              </Link>
            ) : (
              <Card 
                key={pipeline.id}
                className="p-6 opacity-60 cursor-not-allowed"
                data-testid={`card-pipeline-${pipeline.country.toLowerCase()}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg text-foreground">{pipeline.name}</h2>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {pipeline.country}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{pipeline.description}</p>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                    Coming Soon
                  </span>
                </div>
              </Card>
            )
          ))}
        </div>
      </div>
    </Shell>
  );
}
