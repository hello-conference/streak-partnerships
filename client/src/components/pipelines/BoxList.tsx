import { Box, PipelineWithStages } from "@shared/schema";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Calendar, UserCircle } from "lucide-react";

interface BoxListProps {
  boxes: Box[];
  pipeline: PipelineWithStages;
}

export function BoxList({ boxes, pipeline }: BoxListProps) {
  const getStageName = (key?: string) => {
    if (!key || !pipeline.stages) return "Unknown Stage";
    return pipeline.stages[key]?.name || key;
  };

  if (boxes.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
        <p className="text-muted-foreground">No items found in this pipeline.</p>
      </div>
    );
  }

  // Group boxes by stage if needed, but for a list view we'll just show them
  // A real Kanban board would be complex, so we'll stick to a high-quality list view
  
  return (
    <div className="space-y-4">
      {boxes.map((box, idx) => (
        <motion.div
          key={box.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: idx * 0.05 }}
        >
          <Card className="p-4 hover:shadow-md transition-shadow duration-200 border border-border/60">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground truncate">{box.name}</h4>
                  <StatusBadge status={getStageName(box.stageKey)} />
                </div>
                
                {box.notes && (
                  <p className="text-sm text-muted-foreground truncate max-w-2xl">
                    {box.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <UserCircle className="w-4 h-4" />
                  <span>Assigned</span>
                </div>
                
                {box.lastUpdatedTimestamp && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{format(box.lastUpdatedTimestamp, "MMM d, yyyy")}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
