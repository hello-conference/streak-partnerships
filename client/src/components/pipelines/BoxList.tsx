import { Box, PipelineWithStages } from "@shared/schema";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Calendar, ChevronDown, Mail } from "lucide-react";
import { useState } from "react";

interface BoxListProps {
  boxes: Box[];
  pipeline: PipelineWithStages;
}

export function BoxList({ boxes, pipeline }: BoxListProps) {
  const [expandedPartnership, setExpandedPartnership] = useState<string | null>(null);

  const getStageName = (key?: string) => {
    if (!key || !pipeline.stages) return "Unknown Stage";
    return pipeline.stages[key]?.name || key;
  };

  const getPartnershipValue = (box: Box): string => {
    const boxObj = box as any;
    
    // Check if the backend has resolved the partnership field (1001_resolved)
    if (boxObj.fields?.["1001_resolved"]) {
      return boxObj.fields["1001_resolved"];
    }
    
    // Fallback: try known partnership names in the fields
    if (boxObj.fields?.["1001"]) {
      const val = boxObj.fields["1001"];
      if (typeof val === "string") {
        // Map numeric field values to names (from Streak API)
        const fieldMap: Record<string, string> = {
          "9001": "Ultimate",
          "9002": "Gold", 
          "9003": "Platinum",
          "9004": "Silver"
        };
        if (fieldMap[val]) return fieldMap[val];
      }
    }
    
    return "Unassigned";
  };

  if (boxes.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
        <p className="text-muted-foreground">No items found in this pipeline.</p>
      </div>
    );
  }

  // Group boxes: first by partnership, then by stage
  const groupedData: Record<string, Record<string, Box[]>> = {};
  
  boxes.forEach((box) => {
    const partnership = getPartnershipValue(box);
    const stage = getStageName(box.stageKey);
    
    if (!groupedData[partnership]) {
      groupedData[partnership] = {};
    }
    if (!groupedData[partnership][stage]) {
      groupedData[partnership][stage] = [];
    }
    groupedData[partnership][stage].push(box);
  });

  // Partnership order preference
  const partnershipOrder = ["Ultimate", "Platinum", "Gold", "Silver", "Unassigned"];
  const sortedPartnerships = Object.keys(groupedData).sort(
    (a, b) => partnershipOrder.indexOf(a) - partnershipOrder.indexOf(b)
  );

  return (
    <div className="space-y-4">
      {sortedPartnerships.map((partnership) => (
        <div key={partnership} className="border border-border/50 rounded-lg overflow-hidden">
          {/* Partnership Header */}
          <button
            onClick={() => setExpandedPartnership(
              expandedPartnership === partnership ? null : partnership
            )}
            className="w-full px-4 py-3 bg-card hover:bg-card/80 border-b border-border/30 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3">
              <ChevronDown 
                className={`w-4 h-4 transition-transform ${
                  expandedPartnership === partnership ? "rotate-180" : ""
                }`}
              />
              <h3 className="font-semibold text-foreground">{partnership}</h3>
              <span className="text-sm text-muted-foreground">
                ({Object.values(groupedData[partnership]).reduce((sum, boxes) => sum + boxes.length, 0)} items)
              </span>
            </div>
          </button>

          {/* Stages and Boxes */}
          {expandedPartnership === partnership && (
            <div className="divide-y divide-border/30">
              {Object.entries(groupedData[partnership]).map(([stage, stageBoxes]) => (
                <div key={stage} className="p-4 bg-muted/20">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    {stage} ({stageBoxes.length})
                  </h4>
                  <div className="space-y-2">
                    {stageBoxes.map((box, idx) => (
                      <motion.div
                        key={box.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                      >
                        <Card className="p-3 bg-background hover:shadow-sm transition-shadow">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-foreground truncate text-sm">
                                  {box.name}
                                </h5>
                                {box.notes && (
                                  <p className="text-xs text-muted-foreground truncate mt-1">
                                    {box.notes}
                                  </p>
                                )}
                              </div>
                              {box.lastUpdatedTimestamp && (
                                <div className="text-xs text-muted-foreground flex-shrink-0">
                                  {format(box.lastUpdatedTimestamp, "MMM d")}
                                </div>
                              )}
                            </div>
                            
                            {/* Contacts/Email Addresses */}
                            {(box as any).emailAddresses && (box as any).emailAddresses.length > 0 && (
                              <div className="flex items-start gap-2 pt-1 border-t border-border/30">
                                <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-muted-foreground space-y-0.5 flex-1 min-w-0">
                                  {(box as any).emailAddresses.slice(0, 2).map((email: string, idx: number) => (
                                    <div key={idx} className="truncate">
                                      {email}
                                    </div>
                                  ))}
                                  {(box as any).emailAddresses.length > 2 && (
                                    <div className="text-xs text-muted-foreground/70">
                                      +{(box as any).emailAddresses.length - 2} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
