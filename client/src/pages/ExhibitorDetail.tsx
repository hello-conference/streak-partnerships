import { Shell } from "@/components/layout/Shell";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { useExhibitorById, usePretixItems } from "@/hooks/use-pretix";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Ticket, Copy, CheckCircle2, ChevronDown, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";

function getItemName(itemId: number | null, itemsMap: Record<number, string>): string {
  if (!itemId) return "General";
  return itemsMap[itemId] || `Item #${itemId}`;
}

function getItemBadgeLabel(itemId: number | null, itemsMap: Record<number, string>): string {
  if (!itemId) return "General";
  const name = itemsMap[itemId];
  if (!name) return `#${itemId}`;
  const lower = name.toLowerCase();
  if (lower.includes("free")) return "Free";
  if (lower.includes("partner")) return "Partner";
  if (lower.includes("knight")) return "Knight";
  const words = name.split(/[\s-]+/);
  return words.length > 2 ? words.slice(0, 2).join(" ") : name;
}

function isVoucherFree(voucher: any): boolean {
  if (voucher.price_mode === "set" && parseFloat(voucher.value || "0") === 0) return true;
  if (voucher.price_mode === "none" || !voucher.price_mode) return true;
  return false;
}

function isPaidVoucher(voucher: any): boolean {
  return !isVoucherFree(voucher);
}

function formatPrice(voucher: any): string | null {
  if (voucher.price_mode === "set" && voucher.value) {
    const val = parseFloat(voucher.value);
    if (val === 0) return "Free";
    return `\u20AC${val.toFixed(2)}`;
  }
  if (voucher.price_mode === "percent" && voucher.value) {
    return `${voucher.value}% off`;
  }
  return null;
}

function calculateVoucherRevenue(voucher: any): number {
  if (!isPaidVoucher(voucher)) return 0;
  const redeemed = voucher.redeemed || 0;
  if (redeemed === 0) return 0;

  if (voucher.order_positions && voucher.order_positions.length > 0) {
    return voucher.order_positions.reduce((sum: number, pos: any) => {
      return sum + parseFloat(pos.price || "0");
    }, 0);
  }

  if (voucher.price_mode === "set" && voucher.value) {
    return redeemed * parseFloat(voucher.value);
  }
  return 0;
}

function detectPartnershipLevel(vouchers: any[]): string | null {
  for (const v of vouchers) {
    const comment = v.comment || v.exhibitor_comment || "";
    const match = comment.match(/\b(Ultimate|Platinum|Gold|Silver)\b/i);
    if (match) return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  }
  return null;
}

function getPartnershipBadgeColor(level: string): string {
  switch (level.toLowerCase()) {
    case "ultimate": return "bg-purple-600 text-white dark:bg-purple-500";
    case "platinum": return "bg-slate-500 text-white dark:bg-slate-400 dark:text-slate-900";
    case "gold": return "bg-yellow-500 text-white dark:bg-yellow-400 dark:text-yellow-900";
    case "silver": return "bg-gray-400 text-white dark:bg-gray-300 dark:text-gray-800";
    default: return "";
  }
}

export default function ExhibitorDetail() {
  const [, params] = useRoute("/pipelines/:pipelineKey/exhibitors/:id");
  const exhibitorId = params?.id ? parseInt(params.id) : null;
  const pipelineKey = params?.pipelineKey || "";
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedVouchers, setExpandedVouchers] = useState<Record<number, boolean>>({});

  const { data: exhibitor, isLoading, error } = useExhibitorById(exhibitorId);
  const { data: items } = usePretixItems();

  const itemsMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (items) {
      for (const item of items) {
        const name = typeof item.name === "object"
          ? (item.name.en || Object.values(item.name)[0] || `Item #${item.id}`)
          : (item.name || `Item #${item.id}`);
        map[item.id] = name as string;
      }
    }
    return map;
  }, [items]);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleVoucherExpand = (voucherId: number) => {
    setExpandedVouchers(prev => ({ ...prev, [voucherId]: !prev[voucherId] }));
  };

  if (isLoading) {
    return (
      <Shell>
        <LoadingSpinner />
      </Shell>
    );
  }

  const backLink = pipelineKey ? `/pipelines/${pipelineKey}` : "/";
  const backLabel = pipelineKey ? "Back to Pipeline" : "Back to Dashboard";

  if (error || !exhibitor) {
    return (
      <Shell>
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load exhibitor details.</p>
          <Link href={backLink} className="text-sm text-muted-foreground hover:text-foreground mt-2 inline-block">
            {backLabel}
          </Link>
        </div>
      </Shell>
    );
  }

  const vouchers = exhibitor.vouchers || [];
  const freeVouchers = vouchers.filter((v: any) => isVoucherFree(v));
  const paidVouchers = vouchers.filter((v: any) => isPaidVoucher(v));

  const freeMaxUsages = freeVouchers.reduce((sum: number, v: any) => sum + (v.max_usages || 0), 0);
  const freeClaimed = freeVouchers.reduce((sum: number, v: any) => sum + (v.redeemed || 0), 0);
  const paidMaxUsages = paidVouchers.reduce((sum: number, v: any) => sum + (v.max_usages || 0), 0);
  const paidClaimed = paidVouchers.reduce((sum: number, v: any) => sum + (v.redeemed || 0), 0);
  const totalRevenue = vouchers.reduce((sum: number, v: any) => sum + calculateVoucherRevenue(v), 0);
  const partnershipLevel = detectPartnershipLevel(vouchers);

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <Link href={backLink} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit" data-testid="link-back-pipeline">
          <ChevronLeft className="w-4 h-4" />
          {backLabel}
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Ticket className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-exhibitor-title">
              {exhibitor.name}
            </h1>
            {partnershipLevel && (
              <Badge className={`text-xs ${getPartnershipBadgeColor(partnershipLevel)}`} data-testid="badge-partnership-level">
                {partnershipLevel}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">Voucher usage and ticket assignment details from Pretix.</p>
          {exhibitor.access_code && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Access Code:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{exhibitor.access_code}</code>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Total Vouchers</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-total-vouchers">{vouchers.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Free Tickets Claimed</div>
            <div className="text-2xl font-bold" data-testid="text-free-claimed">
              <span className={freeClaimed > 0 ? "text-green-600 dark:text-green-400" : "text-foreground"}>
                {freeClaimed}
              </span>
              <span className="text-sm text-muted-foreground font-normal"> / {freeMaxUsages}</span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Paid Tickets Claimed</div>
            <div className="text-2xl font-bold" data-testid="text-paid-claimed">
              <span className={paidClaimed > 0 ? "text-green-600 dark:text-green-400" : "text-foreground"}>
                {paidClaimed}
              </span>
              <span className="text-sm text-muted-foreground font-normal"> / {paidMaxUsages}</span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Extra Ticket Revenue</div>
            <div className="text-2xl font-bold" data-testid="text-extra-revenue">
              <span className={totalRevenue > 0 ? "text-green-600 dark:text-green-400" : "text-foreground"}>
                {"\u20AC"}{totalRevenue.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground font-normal ml-1">excl. VAT</span>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Voucher Details</h2>

          {vouchers.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No vouchers found for this exhibitor.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {vouchers.map((voucher: any) => {
                const claimed = voucher.redeemed || 0;
                const total = voucher.max_usages || 0;
                const percentage = total > 0 ? (claimed / total) * 100 : 0;
                const isCopied = copiedCode === voucher.code;
                const itemName = getItemName(voucher.item, itemsMap);
                const badgeLabel = getItemBadgeLabel(voucher.item, itemsMap);
                const priceDisplay = formatPrice(voucher);
                const isFree = isVoucherFree(voucher);
                const isPaid = isPaidVoucher(voucher);
                const hasPositions = voucher.order_positions && voucher.order_positions.length > 0;
                const isExpanded = expandedVouchers[voucher.id] || false;
                const isCollapsible = isPaid && (hasPositions || claimed > 0);

                return (
                  <Card key={voucher.id} className="p-4" data-testid={`card-voucher-${voucher.id}`}>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={isFree ? "secondary" : "default"} className="text-xs" data-testid={`badge-ticket-type-${voucher.id}`}>
                            {isFree ? "Free" : "Paid"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {badgeLabel}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">
                            {itemName}
                          </span>
                          {priceDisplay && priceDisplay !== "Free" && (
                            <span className="text-xs text-muted-foreground">
                              ({priceDisplay})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono" data-testid={`text-voucher-code-${voucher.id}`}>
                            {voucher.code}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyToClipboard(voucher.code)}
                            data-testid={`button-copy-voucher-${voucher.id}`}
                          >
                            {isCopied ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            {claimed} of {total} claimed
                          </span>
                          <span className="text-xs font-medium text-foreground">
                            {Math.round(percentage)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              percentage === 100
                                ? "bg-green-500"
                                : percentage > 0
                                ? "bg-primary"
                                : "bg-muted-foreground/20"
                            }`}
                            style={{ width: `${percentage}%` }}
                            data-testid={`progress-voucher-${voucher.id}`}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {voucher.comment && (
                          <span>{voucher.comment}</span>
                        )}
                        {voucher.exhibitor_comment && !voucher.comment && (
                          <span>{voucher.exhibitor_comment}</span>
                        )}
                        {voucher.valid_until && (
                          <span>Expires: {new Date(voucher.valid_until).toLocaleDateString()}</span>
                        )}
                      </div>

                      {isCollapsible && (
                        <div className="border-t border-border pt-2">
                          <button
                            onClick={() => toggleVoucherExpand(voucher.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                            data-testid={`button-expand-assignments-${voucher.id}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                            <span>Ticket Assignments ({claimed})</span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-1.5">
                              {hasPositions ? (
                                voucher.order_positions.map((pos: any, idx: number) => {
                                  const firstName = pos.attendee_name_parts?.given_name || "";
                                  const lastName = pos.attendee_name_parts?.family_name || "";
                                  const fullName = pos.attendee_name || `${firstName} ${lastName}`.trim();
                                  const email = pos.attendee_email || "";

                                  return (
                                    <div
                                      key={pos.id || idx}
                                      className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-1.5 px-2 rounded bg-muted/50 text-xs"
                                      data-testid={`row-assignment-${voucher.id}-${idx}`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="font-medium text-foreground truncate">
                                          {firstName && lastName
                                            ? `${firstName} ${lastName}`
                                            : fullName || "N/A"}
                                        </span>
                                      </div>
                                      {email && (
                                        <span className="text-muted-foreground truncate">{email}</span>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-xs text-muted-foreground py-1">
                                  {claimed} ticket(s) claimed but attendee details are not yet available.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
