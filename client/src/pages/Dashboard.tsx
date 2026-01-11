import { Shell } from "@/components/layout/Shell";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Building2, MapPin, ArrowRight } from "lucide-react";

const pipelines = [
  {
    id: "agxzfm1haWxmb29nYWVyMwsSDE9yZ2FuaXphdGlvbiIMdGVjaG9yYW1hLmJlDAsSCFdvcmtmbG93GICApZrW4vgKDA",
    name: "Partners 2026 BE",
    country: "Belgium",
    flag: "BE",
    status: "active",
    description: "Manage partnership deals for Techorama Belgium 2026"
  },
  {
    id: "nl-pipeline",
    name: "Partners 2026 NL",
    country: "Netherlands",
    flag: "NL",
    status: "coming_soon",
    description: "Partnership deals for Techorama Netherlands 2026"
  }
];

export default function Dashboard() {
  return (
    <Shell>
      <div className="flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2" data-testid="text-dashboard-title">
            StreakFlow Dashboard
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
