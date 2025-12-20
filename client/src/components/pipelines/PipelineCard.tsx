import { PipelineWithStages } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { format } from "date-fns";
import { ArrowRight, Box } from "lucide-react";

interface PipelineCardProps {
  pipeline: PipelineWithStages;
}

export function PipelineCard({ pipeline }: PipelineCardProps) {
  const stageCount = pipeline.stages ? Object.keys(pipeline.stages).length : 0;
  
  return (
    <Link href={`/pipelines/${pipeline.key}`} className="block group">
      <Card className="h-full p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-xl transition-all group-hover:scale-150" />
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Box className="w-5 h-5" />
            </div>
            <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
              {pipeline.key}
            </span>
          </div>
          
          <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
            {pipeline.name}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-grow">
            {pipeline.description || "No description provided."}
          </p>
          
          <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs text-muted-foreground">
            <div className="flex gap-4">
              <span>{stageCount} Stages</span>
              {pipeline.lastUpdatedTimestamp && (
                <span>Updated {format(pipeline.lastUpdatedTimestamp, "MMM d")}</span>
              )}
            </div>
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-primary" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
