import { Shell } from "@/components/layout/Shell";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { useExhibitorById } from "@/hooks/use-pretix";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Ticket, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const FREE_ITEM_ID = 907413;
const PARTNER_ITEM_ID = 907414;

function getTicketTypeName(itemId: number): string {
  if (itemId === FREE_ITEM_ID) return "Free (2-day conference, May 12-13)";
  if (itemId === PARTNER_ITEM_ID) return "Partner (2-day conference, May 12-13)";
  return "Unknown";
}

function getTicketTypeLabel(itemId: number): string {
  if (itemId === FREE_ITEM_ID) return "Free";
  if (itemId === PARTNER_ITEM_ID) return "Partner";
  return "Other";
}

export default function ExhibitorDetail() {
  const [, params] = useRoute("/exhibitors/:id");
  const exhibitorId = params?.id ? parseInt(params.id) : null;
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: exhibitor, isLoading, error } = useExhibitorById(exhibitorId);

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

  if (error || !exhibitor) {
    return (
      <Shell>
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load exhibitor details.</p>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </Shell>
    );
  }

  const vouchers = exhibitor.vouchers || [];
  const freeVouchers = vouchers.filter((v: any) => v.item === FREE_ITEM_ID);
  const partnerVouchers = vouchers.filter((v: any) => v.item === PARTNER_ITEM_ID);
  const allVouchers = [...freeVouchers, ...partnerVouchers];

  const totalMaxUsages = allVouchers.reduce((sum: number, v: any) => sum + (v.max_usages || 0), 0);
  const totalRedeemed = allVouchers.reduce((sum: number, v: any) => sum + (v.redeemed || 0), 0);

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit" data-testid="link-back-dashboard">
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1">Total Vouchers</div>
            <div className="text-2xl font-bold text-foreground" data-testid="text-total-vouchers">{allVouchers.length}</div>
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

        {/* Voucher Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Voucher Details</h2>

          {allVouchers.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No vouchers found for this exhibitor.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {allVouchers.map((voucher: any) => {
                const claimed = voucher.redeemed || 0;
                const total = voucher.max_usages || 0;
                const percentage = total > 0 ? (claimed / total) * 100 : 0;
                const isCopied = copiedCode === voucher.code;

                return (
                  <Card key={voucher.id} className="p-4" data-testid={`card-voucher-${voucher.id}`}>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-ticket-type-${voucher.id}`}>
                            {getTicketTypeLabel(voucher.item)}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">
                            {getTicketTypeName(voucher.item)}
                          </span>
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

                      {/* Usage Progress */}
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

                      {/* Voucher Meta */}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {voucher.comment && (
                          <span>{voucher.comment}</span>
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
