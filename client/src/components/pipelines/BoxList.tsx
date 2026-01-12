import { Box, PipelineWithStages } from "@shared/schema";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Calendar, ChevronDown, Mail, DollarSign, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { buildUrl, api } from "@shared/routes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BoxListProps {
  boxes: Box[];
  pipeline: PipelineWithStages;
  prevYearStats?: Record<string, { count: number; total: number }>;
}

export function BoxList({ boxes, pipeline, prevYearStats = {} }: BoxListProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [expandedPartnershipLevels, setExpandedPartnershipLevels] = useState<Record<string, boolean>>({
    "Ultimate": true,
    "Platinum": true,
    "Gold": true,
    "Silver": true
  });
  
  // State for the confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    boxKey: string;
    boxName: string;
    currentValue: boolean;
  }>({ open: false, boxKey: "", boxName: "", currentValue: false });

  // Mutation to update partner page live status
  const updateFieldMutation = useMutation({
    mutationFn: async ({ boxKey, value }: { boxKey: string; value: boolean }) => {
      const url = buildUrl(api.boxes.updateField.path, { key: boxKey, fieldKey: "1002" });
      await apiRequest("POST", url, { value });
    },
    onSuccess: () => {
      // Invalidate boxes query to refresh data
      queryClient.invalidateQueries({ queryKey: [api.pipelines.getBoxes.path] });
      setConfirmDialog({ open: false, boxKey: "", boxName: "", currentValue: false });
    },
  });

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
          "9002": "Platinum", 
          "9003": "Gold",
          "9004": "Silver"
        };
        if (fieldMap[val]) return fieldMap[val];
      }
    }
    
    return "";
  };

  const getPrice = (box: Box): number | null => {
    const boxObj = box as any;
    const priceField = boxObj.fields?.["1003"];
    
    if (priceField && typeof priceField === "object" && priceField.calculationValue) {
      return priceField.calculationValue;
    }
    
    return null;
  };

  const isPartnerPageLive = (box: Box): boolean => {
    const boxObj = box as any;
    return boxObj.fields?.partnerPageLive === true;
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
    if (partnership && partnership !== "") {
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
                    
                    const isPartnershipExpanded = expandedPartnershipLevels[partnership] ?? true;
                    
                    const prevPartnershipStats = prevYearStats[partnership];
                    
                    return (
                    <div key={partnership} className={`${getPartnershipColor(partnership)}`}>
                      <button
                        onClick={() => setExpandedPartnershipLevels(prev => ({
                          ...prev,
                          [partnership]: !prev[partnership]
                        }))}
                        className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-3">
                          <ChevronDown 
                            className={`w-4 h-4 transition-transform ${
                              isPartnershipExpanded ? "rotate-180" : ""
                            }`}
                          />
                          <h4 className="text-sm font-medium text-foreground font-semibold">
                            {partnership} ({partnershipBoxes.length})
                          </h4>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="text-sm font-semibold text-primary">
                            {formatCurrency(partnershipTotal)}
                          </div>
                          {prevPartnershipStats && (
                            <div className="text-xs text-muted-foreground/70">
                              2025: {formatCurrency(prevPartnershipStats.total)}
                            </div>
                          )}
                        </div>
                      </button>
                      {isPartnershipExpanded && (
                      <div className="space-y-2 px-4 pb-4">
                        {partnershipBoxes.map((box, idx) => {
                          const boxPrice = getPrice(box);
                          const pageLive = isPartnerPageLive(box);
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
                                  <div className="flex-1 min-w-0 flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDialog({
                                          open: true,
                                          boxKey: box.key,
                                          boxName: box.name,
                                          currentValue: pageLive
                                        });
                                      }}
                                      className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0 cursor-pointer transition-opacity hover:opacity-80 ${
                                        pageLive 
                                          ? "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30" 
                                          : "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
                                      }`}
                                      title={pageLive ? "Partner Page Live - Click to deactivate" : "Partner Page Not Live - Click to activate"}
                                      data-testid={pageLive ? "badge-live-status" : "badge-not-live-status"}
                                    >
                                      {pageLive ? (
                                        <>
                                          <CheckCircle2 className="w-3 h-3" />
                                          LIVE
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="w-3 h-3" />
                                          OFF
                                        </>
                                      )}
                                    </button>
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
                                
                                {/* Contacts - Always show linked contacts from Streak */}
                                {(() => {
                                  const contacts = (box as any).contacts || [];
                                  
                                  if (contacts.length === 0) return null;
                                  
                                  return (
                                    <div className="flex items-start gap-2 pt-1 border-t border-border/30">
                                      <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                      <div className="text-xs text-muted-foreground space-y-0.5 flex-1 min-w-0">
                                        {contacts.slice(0, 3).map((contact: any, idx: number) => (
                                          <div key={idx} className="truncate">
                                            {contact.name && contact.email 
                                              ? `${contact.name} - ${contact.email}` 
                                              : contact.email || contact.name}
                                          </div>
                                        ))}
                                        {contacts.length > 3 && (
                                          <div className="text-muted-foreground/70">+{contacts.length - 3} more</div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </Card>
                          </motion.div>
                        );
                        })}
                      </div>
                      )}
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
                              
                              {/* Contacts - Always show linked contacts from Streak */}
                              {(() => {
                                const contacts = (box as any).contacts || [];
                                
                                if (contacts.length === 0) return null;
                                
                                return (
                                  <div className="flex items-start gap-2 pt-1 border-t border-border/30">
                                    <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-muted-foreground space-y-0.5 flex-1 min-w-0">
                                      {contacts.slice(0, 3).map((contact: any, idx: number) => (
                                        <div key={idx} className="truncate">
                                          {contact.name && contact.email 
                                            ? `${contact.name} - ${contact.email}` 
                                            : contact.email || contact.name}
                                        </div>
                                      ))}
                                      {contacts.length > 3 && (
                                        <div className="text-muted-foreground/70">+{contacts.length - 3} more</div>
                                      )}
                                    </div>
                                  </div>
                                );
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

      {/* Confirmation Dialog for toggling Partner Page Live status */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => {
        if (!open) setConfirmDialog({ open: false, boxKey: "", boxName: "", currentValue: false });
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.currentValue ? "Deactivate Partner Page?" : "Activate Partner Page?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.currentValue 
                ? `Are you sure you want to mark the partner page for "${confirmDialog.boxName}" as not live?`
                : `Are you sure you want to mark the partner page for "${confirmDialog.boxName}" as live?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateFieldMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                updateFieldMutation.mutate({
                  boxKey: confirmDialog.boxKey,
                  value: !confirmDialog.currentValue
                });
              }}
              disabled={updateFieldMutation.isPending}
              data-testid="button-confirm-toggle"
            >
              {updateFieldMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
