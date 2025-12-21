import { Box, PipelineWithStages } from "@shared/schema";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Calendar, ChevronDown, Mail, DollarSign } from "lucide-react";
import { useState } from "react";

interface BoxListProps {
  boxes: Box[];
  pipeline: PipelineWithStages;
}

export function BoxList({ boxes, pipeline }: BoxListProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

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
    
    return null;
  };

  const getPrice = (box: Box): number | null => {
    const boxObj = box as any;
    const priceField = boxObj.fields?.["1003"];
    
    if (priceField && typeof priceField === "object" && priceField.calculationValue) {
      return priceField.calculationValue;
    }
    
    return null;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getPartnershipColor = (partnership: string): string => {
    switch (partnership) {
      case "Ultimate":
        return "bg-amber-950/20 border-l-4 border-l-amber-600";
      case "Platinum":
        return "bg-slate-600/10 border-l-4 border-l-slate-400";
      case "Gold":
        return "bg-yellow-600/10 border-l-4 border-l-yellow-500";
      case "Silver":
        return "bg-gray-400/10 border-l-4 border-l-gray-400";
      default:
        return "bg-muted/20";
    }
  };

  if (boxes.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
        <p className="text-muted-foreground">No items found in this pipeline.</p>
      </div>
    );
  }

  // Categorize boxes into 3 sections
  const confirmedBoxes: Record<string, Box[]> = {};
  const unconfirmedBoxes: Box[] = [];
  const rejectedBoxes: Box[] = [];

  boxes.forEach((box) => {
    const partnership = getPartnershipValue(box);
    const stageName = getStageName(box.stageKey);
    
    // Section 1: Confirmed partnerships (have a partnership assigned)
    if (partnership && partnership !== null) {
      if (!confirmedBoxes[partnership]) {
        confirmedBoxes[partnership] = [];
      }
      confirmedBoxes[partnership].push(box);
    }
    // Section 2: Unconfirmed leads (no partnership, stage is "New" or "Contacted / Not Decided")
    else if (stageName === "New" || stageName === "Contacted / Not Decided") {
      unconfirmedBoxes.push(box);
    }
    // Section 3: Rejected partnerships
    else if (stageName === "Rejected") {
      rejectedBoxes.push(box);
    }
  });

  const sections = [
    {
      id: 1,
      title: "Confirmed Partnerships",
      description: "Almost confirmed partnerships with assigned levels",
      boxes: confirmedBoxes,
      count: Object.values(confirmedBoxes).reduce((sum, arr) => sum + arr.length, 0),
      isGrouped: true
    },
    {
      id: 2,
      title: "Unconfirmed Leads",
      description: "Leads waiting for confirmation (New or Contacted / Not Decided)",
      boxes: unconfirmedBoxes,
      count: unconfirmedBoxes.length,
      isGrouped: false
    },
    {
      id: 3,
      title: "Rejected Partnerships",
      description: "Partnerships that were rejected",
      boxes: rejectedBoxes,
      count: rejectedBoxes.length,
      isGrouped: false
    }
  ];

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        const hasContent = section.isGrouped 
          ? Object.keys(section.boxes as Record<string, Box[]>).length > 0
          : (section.boxes as Box[]).length > 0;

        if (!hasContent) return null;

        return (
          <div key={section.id} className="border border-border/50 rounded-lg overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              className="w-full px-4 py-3 bg-card hover:bg-card/80 border-b border-border/30 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <ChevronDown 
                  className={`w-4 h-4 transition-transform ${
                    expandedSection === section.id ? "rotate-180" : ""
                  }`}
                />
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">{section.title}</h3>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
                {section.count}
              </span>
            </button>

            {/* Section Content */}
            {expandedSection === section.id && (
              <div className="divide-y divide-border/30">
                {section.isGrouped ? (
                  // Grouped by partnership level
                  Object.entries(section.boxes as Record<string, Box[]>).map(([partnership, partnershipBoxes]) => {
                    const partnershipTotal = partnershipBoxes.reduce((sum, box) => {
                      const price = getPrice(box);
                      return sum + (price || 0);
                    }, 0);
                    
                    return (
                    <div key={partnership} className={`p-4 ${getPartnershipColor(partnership)}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-foreground font-semibold">
                          {partnership} ({partnershipBoxes.length})
                        </h4>
                        <div className="text-sm font-semibold text-primary">
                          {formatCurrency(partnershipTotal)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {partnershipBoxes.map((box, idx) => {
                          const boxPrice = getPrice(box);
                          return (
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
                                    <h5 className="font-medium text-foreground text-sm leading-tight">
                                      <span className="truncate inline">{box.name}</span> <span className="text-muted-foreground text-xs inline align-text-bottom">[{getStageName(box.stageKey)}]</span>
                                    </h5>
                                    {box.notes && (
                                      <p className="text-xs text-muted-foreground truncate mt-1">
                                        {box.notes}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 flex-shrink-0">
                                    {boxPrice && (
                                      <div className="text-xs font-medium text-primary">
                                        {formatCurrency(boxPrice)}
                                      </div>
                                    )}
                                    {box.lastUpdatedTimestamp && (
                                      <div className="text-xs text-muted-foreground">
                                        {format(box.lastUpdatedTimestamp, "MMM d")}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Contacts/Email Addresses */}
                                {(() => {
                                  const customerEmails = (box as any).emailAddresses?.filter(
                                    (email: string) => !email.toLowerCase().includes("techorama.be") && !email.toLowerCase().includes("techorama.nl")
                                  ) || [];
                                  return customerEmails.length > 0 ? (
                                    <div className="flex items-start gap-2 pt-1 border-t border-border/30">
                                      <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                      <div className="text-xs text-muted-foreground space-y-0.5 flex-1 min-w-0">
                                        {customerEmails.slice(0, 2).map((email: string, idx: number) => (
                                          <div key={idx} className="truncate">
                                            {email}
                                          </div>
                                        ))}
                                        {customerEmails.length > 2 && (
                                          <div className="text-xs text-muted-foreground/70">
                                            +{customerEmails.length - 2} more
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            </Card>
                          </motion.div>
                        );
                        })}
                      </div>
                    </div>
                    );
                  })
                ) : (
                  // Ungrouped boxes
                  <div className="p-4 bg-muted/20">
                    <div className="space-y-2">
                      {(section.boxes as Box[]).map((box, idx) => (
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
                                  <h5 className="font-medium text-foreground text-sm leading-tight">
                                    <span className="truncate inline">{box.name}</span> <span className="text-muted-foreground text-xs inline align-text-bottom">[{getStageName(box.stageKey)}]</span>
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
                              {(() => {
                                const customerEmails = (box as any).emailAddresses?.filter(
                                  (email: string) => !email.toLowerCase().includes("techorama.be") && !email.toLowerCase().includes("techorama.nl")
                                ) || [];
                                return customerEmails.length > 0 ? (
                                  <div className="flex items-start gap-2 pt-1 border-t border-border/30">
                                    <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-muted-foreground space-y-0.5 flex-1 min-w-0">
                                      {customerEmails.slice(0, 2).map((email: string, idx: number) => (
                                        <div key={idx} className="truncate">
                                          {email}
                                        </div>
                                      ))}
                                      {customerEmails.length > 2 && (
                                        <div className="text-xs text-muted-foreground/70">
                                          +{customerEmails.length - 2} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
