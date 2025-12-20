import { Shell } from "@/components/layout/Shell";
import { usePipeline, usePipelineBoxes } from "@/hooks/use-pipelines";
import { useRoute } from "wouter";
import { BoxList } from "@/components/pipelines/BoxList";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Filter, Search, Plus } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PipelineDetail() {
  const [match, params] = useRoute("/pipelines/:key");
  const key = match ? params.key : null;
  const { data: pipeline, isLoading: isPipelineLoading } = usePipeline(key);
  const { data: boxes, isLoading: isBoxesLoading } = usePipelineBoxes(key);
  
  const [search, setSearch] = useState("");

  if (isPipelineLoading || isBoxesLoading) {
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

  const totalValue = filteredBoxes.length; // Placeholder for actual value logic if schema had it

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
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">{pipeline.name}</h1>
            <p className="text-muted-foreground max-w-2xl">{pipeline.description || "Manage your deals and track progress."}</p>
          </div>
          
          <Button className="shrink-0 gap-2 shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4" />
            Add New Box
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Items</div>
            <div className="text-2xl font-bold text-primary">{boxes?.length || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Active Stages</div>
            <div className="text-2xl font-bold">{Object.keys(pipeline.stages || {}).length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Last Activity</div>
            <div className="text-xl font-bold truncate">Today</div>
          </Card>
        </div>

        <Separator className="my-2" />

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
          <h2 className="text-lg font-semibold mb-4">Items by Partnership & Stage</h2>
          <BoxList boxes={filteredBoxes} pipeline={pipeline} />
        </div>
      </div>
    </Shell>
  );
}
