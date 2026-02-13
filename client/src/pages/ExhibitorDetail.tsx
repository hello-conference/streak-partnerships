import { Shell } from "@/components/layout/Shell";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { useExhibitorById, usePretixItems } from "@/hooks/use-pretix";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Ticket, Copy, CheckCircle2 } from "lucide-react";
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

export default function ExhibitorDetail() {
  const [, params] = useRoute("/pipelines/:pipelineKey/exhibitors/:id");
  const exhibitorId = params?.id ? parseInt(params.id) : null;
  const pipelineKey = params?.pipelineKey || "";
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const totalMaxUsages = vouchers.reduce((sum: number, v: any) => sum + (v.max_usages || 0), 0);
  const totalRedeemed = vouchers.reduce((sum: number, v: any) => sum + (v.redeemed || 0), 0);

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <Link href={backLink} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit" data-testid="link-back-pipeline">
          <ChevronLeft className="w-4 h-4" />
          {backLabel}
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <Ticket className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-exhibitor-title">
              {exhibitor.name}
            </h1>
          </div>
          <p className="text-muted-foreground">Voucher usage and ticket assignment details from Pretix.</p>
          {exhibitor.access_code && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Access Code:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{exhibitor.access_code}</code>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Total Vouchers</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-total-vouchers">{vouchers.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Tickets Available</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-total-available">{totalMaxUsages}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Tickets Claimed</div>
            <div className="text-2xl font-bold" data-testid="text-total-claimed">
              <span className={totalRedeemed > 0 ? "text-green-600 dark:text-green-400" : "text-foreground"}>
                {totalRedeemed}
              </span>
              <span className="text-sm text-muted-foreground font-normal"> / {totalMaxUsages}</span>
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
                const priceInfo = voucher.price_mode === "set" && voucher.value
                  ? (parseFloat(voucher.value) === 0 ? "Free" : `${voucher.value}`)
                  : voucher.price_mode === "percent" && voucher.value
                  ? `${voucher.value}% off`
                  : null;

                return (
                  <Card key={voucher.id} className="p-4" data-testid={`card-voucher-${voucher.id}`}>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-ticket-type-${voucher.id}`}>
                            {badgeLabel}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">
                            {itemName}
                          </span>
                          {priceInfo && priceInfo !== "Free" && (
                            <span className="text-xs text-muted-foreground">
                              ({priceInfo})
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
