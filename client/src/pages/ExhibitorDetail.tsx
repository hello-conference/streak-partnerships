import { Shell } from "@/components/layout/Shell";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { useExhibitorById, usePretixItems, useEmailLogs, useCreateEmailLog, type PretixOrg } from "@/hooks/use-pretix";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Ticket, Copy, Check, CheckCircle2, ChevronDown, ChevronRight, User, Mail, Send, Clock, History, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const tag = (voucher.tag || "").toLowerCase();
  if (tag.includes("-free")) return true;
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

function getPretixPortalUrl(org: PretixOrg): string {
  const organizer = org === "nl" ? "techorama-nl" : "techorama-be";
  return `https://pretix.eu/${organizer}/2026/`;
}

function buildEmailBody(
  exhibitorName: string,
  accessCode: string,
  vouchers: any[],
  itemsMap: Record<number, string>,
  partnershipLevel: string | null,
  org: PretixOrg,
  contactFirstName: string | null,
): string {
  const portalUrl = getPretixPortalUrl(org);
  const greeting = contactFirstName ? `Dear ${contactFirstName}` : "Dear partner";
  const country = org === "nl" ? "Netherlands" : "Belgium";

  const contactEmail = org === "nl" ? "tickets@techorama.nl" : "tickets@techorama.be";

  const voucherLines = vouchers.map((v: any) => {
    const label = getItemBadgeLabel(v.item, itemsMap);
    const isFree = isVoucherFree(v);
    const maxUsages = v.max_usages || 0;
    const redeemed = v.redeemed || 0;
    const remaining = Math.max(0, maxUsages - redeemed);
    const claimedInfo = redeemed > 0 ? ` - ${redeemed} already claimed, ${remaining} remaining` : "";
    const isKnight = label.toLowerCase() === "knight";
    let priceInfo = isFree ? "Free" : formatPrice(v) || "Paid";
    if (isKnight && !isFree) {
      priceInfo = `${formatPrice(v) || "Paid"} - discounted fixed price for partners`;
    }
    return `  - ${label} (${priceInfo}): ${v.code} (${maxUsages} ticket${maxUsages !== 1 ? "s" : ""}${claimedInfo})`;
  }).join("\n");

  return `${greeting},

Thank you for your ${partnershipLevel ? partnershipLevel + " " : ""}partnership with Techorama ${country} 2026!

As part of your partnership package, we have set up your exhibitor account on our ticketing platform (Pretix). Below you will find your access credentials, voucher codes to claim your included tickets, and lead scanning instructions.

EXHIBITOR PORTAL
${portalUrl}

ACCESS CODE
${accessCode}

Use this access code to log in to the exhibitor portal where you can manage your booth, scan leads, and access your vouchers.

YOUR VOUCHER CODES
${voucherLines}

HOW TO CLAIM YOUR TICKETS
1. Go to ${portalUrl}
2. Enter your access code: ${accessCode}
3. Navigate to the voucher section
4. Use the voucher codes above to claim your tickets

Each voucher code can be used the number of times indicated above. Simply share the relevant voucher code with the people in your team who need a ticket.

LEAD SCANNING INFO
1. Install the Pretix Lead Scan App
2. Login with your access code
3. Start scanning the QR code of the attendees at Techorama
4. Download the results via the portal

If you have any questions or need assistance, don't hesitate to reach out to ${contactEmail}.

Kind regards,
Techorama Team`;
}

function SendTicketEmailDialog({
  exhibitorName,
  exhibitorId,
  accessCode,
  vouchers,
  itemsMap,
  partnershipLevel,
  org,
  defaultEmail,
  defaultContactName,
}: {
  exhibitorName: string;
  exhibitorId: number;
  accessCode: string;
  vouchers: any[];
  itemsMap: Record<number, string>;
  partnershipLevel: string | null;
  org: PretixOrg;
  defaultEmail: string | null;
  defaultContactName: string | null;
}) {
  const [toEmail, setToEmail] = useState(defaultEmail || "");
  const [open, setOpen] = useState(false);
  const logEmailMutation = useCreateEmailLog(org, exhibitorId);

  const contactFirstName = defaultContactName?.split(" ")[0] || null;

  const subject = `Techorama ${org === "nl" ? "Netherlands" : "Belgium"} 2026 - Your Exhibitor Access, Ticket Vouchers and Lead Scanning Info (${exhibitorName})`;

  const body = useMemo(
    () => buildEmailBody(exhibitorName, accessCode, vouchers, itemsMap, partnershipLevel, org, contactFirstName),
    [exhibitorName, accessCode, vouchers, itemsMap, partnershipLevel, org, contactFirstName]
  );

  const [editableBody, setEditableBody] = useState(body);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEditableBody(body);
      setToEmail(defaultEmail || "");
    }
    setOpen(isOpen);
  };

  const handleSend = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(editableBody)}`;
    window.open(gmailUrl, "_blank");
    logEmailMutation.mutate({ sentTo: toEmail, subject, exhibitorName });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="default" data-testid="button-send-ticket-email">
          <Send className="w-4 h-4 mr-2" />
          Send Ticket Info
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Ticket Information</DialogTitle>
          <DialogDescription>
            Compose an email with exhibitor access details and voucher codes. This will open in your email client (Gmail/Streak) so the email is automatically tracked.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email-to">To</Label>
            <Input
              id="email-to"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="recipient@company.com"
              data-testid="input-email-to"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={subject}
              readOnly
              className="text-muted-foreground"
              data-testid="input-email-subject"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email-body">Message</Label>
            <Textarea
              id="email-body"
              value={editableBody}
              onChange={(e) => setEditableBody(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
              data-testid="textarea-email-body"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-email">
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!toEmail.trim()} data-testid="button-compose-email">
            <Mail className="w-4 h-4 mr-2" />
            Compose in Email Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getFreeVoucherAttendeeEmails(vouchers: any[]): string[] {
  const emails: string[] = [];
  for (const v of vouchers) {
    if (!isVoucherFree(v)) continue;
    if (!v.order_positions || v.order_positions.length === 0) continue;
    for (const pos of v.order_positions) {
      const email = pos.attendee_email;
      if (email && !emails.includes(email.toLowerCase())) {
        emails.push(email.toLowerCase());
      }
    }
  }
  return emails;
}

function buildLeadScanEmailBody(
  exhibitorName: string,
  accessCode: string,
  org: PretixOrg,
  contactFirstName: string | null,
): string {
  const portalUrl = getPretixPortalUrl(org);
  const greeting = contactFirstName ? `Dear ${contactFirstName}` : "Dear partner";
  const country = org === "nl" ? "Netherlands" : "Belgium";
  const contactEmail = org === "nl" ? "tickets@techorama.nl" : "tickets@techorama.be";

  return `${greeting},

You are receiving this email because you have been registered as an attendee for Techorama ${country} 2026 as part of the ${exhibitorName} partnership.

As a partner attendee, you have access to the lead scanning functionality at Techorama. Lead scanning allows you to capture contact details of attendees who visit your booth by scanning their badge QR code.

HOW TO USE LEAD SCANNING

1. Install the "pretixLEAD" app on your phone
   - iOS: https://apps.apple.com/app/pretixlead/id1459533296
   - Android: https://play.google.com/store/apps/details?id=eu.pretix.pretixlead

2. Open the app and select "Login by access code"

3. Enter your access code: ${accessCode}

4. You are now ready to scan! Simply tap the scan button and point your camera at the QR code on an attendee's badge.

5. After scanning, you can add notes about the conversation for follow-up.

ACCESSING YOUR SCANNED LEADS

You can download your scanned leads at any time:
- Go to ${portalUrl}
- Enter your access code: ${accessCode}
- Navigate to the "Leads" section
- Download the results as a CSV or Excel file

TIPS FOR EFFECTIVE LEAD SCANNING
- Make sure to scan every visitor at your booth
- Add a short note after each scan to remember the conversation
- Download your leads regularly during and after the event
- The app works offline - scans will sync when you're back online

If you have any questions or need assistance, don't hesitate to reach out to ${contactEmail}.

Kind regards,
Techorama Team`;
}

function SendLeadScanEmailDialog({
  exhibitorName,
  exhibitorId,
  accessCode,
  vouchers,
  org,
  defaultEmail,
  defaultContactName,
}: {
  exhibitorName: string;
  exhibitorId: number;
  accessCode: string;
  vouchers: any[];
  org: PretixOrg;
  defaultEmail: string | null;
  defaultContactName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const logEmailMutation = useCreateEmailLog(org, exhibitorId);

  const contactFirstName = defaultContactName?.split(" ")[0] || null;

  const attendeeEmails = useMemo(() => getFreeVoucherAttendeeEmails(vouchers), [vouchers]);

  const allRecipients = useMemo(() => {
    const recipients: string[] = [];
    if (defaultEmail) {
      recipients.push(defaultEmail.toLowerCase());
    }
    for (const email of attendeeEmails) {
      if (!recipients.includes(email)) {
        recipients.push(email);
      }
    }
    return recipients;
  }, [defaultEmail, attendeeEmails]);

  const [recipients, setRecipients] = useState<string[]>(allRecipients);

  const subject = `Techorama ${org === "nl" ? "Netherlands" : "Belgium"} 2026 - Lead Scanning Info for ${exhibitorName}`;

  const body = useMemo(
    () => buildLeadScanEmailBody(exhibitorName, accessCode, org, contactFirstName),
    [exhibitorName, accessCode, org, contactFirstName]
  );

  const [editableBody, setEditableBody] = useState(body);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEditableBody(body);
      setRecipients(allRecipients);
    }
    setOpen(isOpen);
  };

  const handleSend = () => {
    const toField = recipients.join(",");
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toField)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(editableBody)}`;
    window.open(gmailUrl, "_blank");
    logEmailMutation.mutate({ sentTo: toField, subject, exhibitorName });
    setOpen(false);
  };

  const removeRecipient = (email: string) => {
    setRecipients(prev => prev.filter(e => e !== email));
  };

  const [newRecipient, setNewRecipient] = useState("");
  const addRecipient = () => {
    const email = newRecipient.trim().toLowerCase();
    if (email && !recipients.includes(email)) {
      setRecipients(prev => [...prev, email]);
      setNewRecipient("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-send-lead-scan-email">
          <ScanLine className="w-4 h-4 mr-2" />
          Send Lead Scanning Info
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Lead Scanning Info</DialogTitle>
          <DialogDescription>
            Send lead scanning instructions to the primary contact and all partner attendees. This will open in Gmail for automatic CRM tracking.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>To ({recipients.length} recipient{recipients.length !== 1 ? "s" : ""})</Label>
            <div className="flex flex-wrap gap-1.5">
              {recipients.map((email) => (
                <Badge key={email} variant="secondary" className="text-xs gap-1 pr-1">
                  {email}
                  <button
                    onClick={() => removeRecipient(email)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                    data-testid={`button-remove-recipient-${email}`}
                  >
                    <span className="text-xs leading-none">&times;</span>
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="Add another recipient..."
                className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
                data-testid="input-add-recipient"
              />
              <Button variant="outline" onClick={addRecipient} disabled={!newRecipient.trim()} data-testid="button-add-recipient">
                Add
              </Button>
            </div>
            {attendeeEmails.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No partner attendee emails found yet. Free/partner ticket vouchers have not been redeemed.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lead-scan-subject">Subject</Label>
            <Input
              id="lead-scan-subject"
              value={subject}
              readOnly
              className="text-muted-foreground"
              data-testid="input-lead-scan-subject"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lead-scan-body">Message</Label>
            <Textarea
              id="lead-scan-body"
              value={editableBody}
              onChange={(e) => setEditableBody(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
              data-testid="textarea-lead-scan-body"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-lead-scan">
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={recipients.length === 0} data-testid="button-compose-lead-scan">
            <Mail className="w-4 h-4 mr-2" />
            Compose in Gmail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ExhibitorDetail() {
  const [, params] = useRoute("/pipelines/:pipelineKey/exhibitors/:id");
  const exhibitorId = params?.id ? parseInt(params.id) : null;
  const pipelineKey = params?.pipelineKey || "";
  const searchParams = new URLSearchParams(window.location.search);
  const levelFromUrl = searchParams.get("level");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedVouchers, setExpandedVouchers] = useState<Record<number, boolean>>({});

  const orgFromUrl = searchParams.get("org");
  const org: PretixOrg = (orgFromUrl === "nl" ? "nl" : "be");
  const contactName = searchParams.get("contactName");
  const contactEmail = searchParams.get("contactEmail");
  const { data: exhibitor, isLoading, error } = useExhibitorById(org, exhibitorId);
  const { data: items } = usePretixItems(org);
  const { data: emailLogs } = useEmailLogs(org, exhibitorId);

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
  const partnershipLevel = levelFromUrl || detectPartnershipLevel(vouchers);

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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-muted-foreground">Voucher usage and ticket assignment details from Pretix.</p>
            {exhibitor.access_code && vouchers.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <SendTicketEmailDialog
                  exhibitorName={exhibitor.name}
                  exhibitorId={exhibitor.id}
                  accessCode={exhibitor.access_code}
                  vouchers={vouchers}
                  itemsMap={itemsMap}
                  partnershipLevel={partnershipLevel}
                  org={org}
                  defaultEmail={contactEmail}
                  defaultContactName={contactName}
                />
                <SendLeadScanEmailDialog
                  exhibitorName={exhibitor.name}
                  exhibitorId={exhibitor.id}
                  accessCode={exhibitor.access_code}
                  vouchers={vouchers}
                  org={org}
                  defaultEmail={contactEmail}
                  defaultContactName={contactName}
                />
              </div>
            )}
          </div>
          {exhibitor.access_code && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Access Code:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{exhibitor.access_code}</code>
              <Button
                size="icon"
                variant="ghost"
                data-testid="button-copy-access-code"
                onClick={() => copyToClipboard(exhibitor.access_code!)}
              >
                {copiedCode === exhibitor.access_code ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          )}
          {contactEmail && (
            <div className="flex items-center gap-2 mt-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {contactName && <span className="font-medium text-foreground">{contactName}</span>}
                {contactName && " — "}
                <span>{contactEmail}</span>
              </span>
              <Button
                size="icon"
                variant="ghost"
                data-testid="button-copy-contact-email"
                onClick={() => copyToClipboard(contactEmail)}
              >
                {copiedCode === contactEmail ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
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

          {emailLogs && emailLogs.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Email Log</h3>
                <Badge variant="secondary">{emailLogs.length}</Badge>
              </div>
              <Card>
                <div className="divide-y">
                  {emailLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3" data-testid={`email-log-${log.id}`}>
                      <Mail className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium" data-testid={`email-log-subject-${log.id}`}>{log.subject}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="text-xs text-muted-foreground">To:</span>
                          <span className="text-xs" data-testid={`email-log-to-${log.id}`}>{log.sentTo}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-xs text-muted-foreground">From:</span>
                          <span className="text-xs" data-testid={`email-log-from-${log.id}`}>{log.sentBy}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.sentAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
