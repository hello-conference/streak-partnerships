const PRETIX_BASE = "https://pretix.eu/api/v1";
const KNIGHT_TICKET_PRICE = "775.00";
const KNIGHT_TICKET_MAX_USAGES = 20;

export type PretixOrg = "be" | "nl";

interface PretixOrgConfig {
  organizer: string;
  event: string;
  apiKeyEnv: string;
  freeItemId: number | null;
  partnerItemId: number | null;
}

const ORG_CONFIGS: Record<PretixOrg, PretixOrgConfig> = {
  be: {
    organizer: "techorama-be",
    event: "2026",
    apiKeyEnv: "PRETIX_API_KEY",
    freeItemId: 907413,
    partnerItemId: 907414,
  },
  nl: {
    organizer: "techorama-nl",
    event: "2026",
    apiKeyEnv: "PRETIX_API_KEY_NL",
    freeItemId: null,
    partnerItemId: null,
  },
};

const nlItemCache: { freeItemId: number | null; partnerItemId: number | null; loaded: boolean } = {
  freeItemId: null,
  partnerItemId: null,
  loaded: false,
};

export function getOrgConfig(org: PretixOrg): PretixOrgConfig {
  return ORG_CONFIGS[org];
}

export async function getResolvedItemIds(org: PretixOrg): Promise<{ freeItemId: number; partnerItemId: number }> {
  const config = ORG_CONFIGS[org];
  if (config.freeItemId && config.partnerItemId) {
    return { freeItemId: config.freeItemId, partnerItemId: config.partnerItemId };
  }
  if (org === "nl" && nlItemCache.loaded && nlItemCache.freeItemId && nlItemCache.partnerItemId) {
    return { freeItemId: nlItemCache.freeItemId, partnerItemId: nlItemCache.partnerItemId };
  }
  const items = await listItems(org);
  let freeId: number | null = null;
  let partnerId: number | null = null;
  for (const item of items) {
    const name = typeof item.name === "object"
      ? (item.name.en || Object.values(item.name)[0] || "")
      : (item.name || "");
    const lower = (name as string).toLowerCase();
    if (!freeId && (
      lower.includes("free conference") || 
      lower.includes("conference ticket") || 
      (lower.includes("free") && lower.includes("ticket")) ||
      (lower.includes("free") && lower.includes("conference") && !lower.includes("workshop"))
    )) {
      freeId = item.id;
    }
    if (!partnerId && (
      lower.includes("partner ticket") || 
      lower.includes("partner pass") || 
      (lower.startsWith("partner") && lower.includes("conference") && !lower.includes("workshop")) ||
      (lower.includes("partner") && !lower.includes("knight") && !lower.includes("free") && !lower.includes("workshop"))
    )) {
      partnerId = item.id;
    }
  }
  if (!freeId || !partnerId) {
    throw new Error(`Could not find free/partner item IDs for ${org.toUpperCase()} org. Items found: ${items.map((i: any) => { const n = typeof i.name === "object" ? (i.name.en || Object.values(i.name)[0]) : i.name; return `${i.id}:${n}`; }).join(", ")}`);
  }
  if (org === "nl") {
    nlItemCache.freeItemId = freeId;
    nlItemCache.partnerItemId = partnerId;
    nlItemCache.loaded = true;
  }
  return { freeItemId: freeId, partnerItemId: partnerId };
}

export const VOUCHER_ALLOCATIONS: Record<string, { free: number; partner: number }> = {
  "Silver": { free: 1, partner: 2 },
  "Gold": { free: 2, partner: 3 },
  "Platinum": { free: 3, partner: 4 },
  "Ultimate": { free: 5, partner: 5 },
};

export async function pretixFetch(org: PretixOrg, path: string, method: string = "GET", body?: any) {
  const config = ORG_CONFIGS[org];
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) {
    throw new Error(`${config.apiKeyEnv} environment variable is not set`);
  }

  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${PRETIX_BASE}${path}`, options);

  if (!response.ok) {
    const text = await response.text();
    console.error(`Pretix API Error (${org}): ${response.status} ${text}`);
    throw new Error(`Pretix API returned ${response.status}: ${text}`);
  }

  return response.json();
}

function orgPath(org: PretixOrg): string {
  const config = ORG_CONFIGS[org];
  return `/organizers/${config.organizer}/events/${config.event}`;
}

export async function listExhibitors(org: PretixOrg): Promise<any[]> {
  const allExhibitors: any[] = [];
  let url = `${orgPath(org)}/exhibitors/`;

  while (url) {
    const data = await pretixFetch(org, url);
    allExhibitors.push(...(data.results || []));
    if (data.next) {
      const nextUrl = new URL(data.next);
      url = nextUrl.pathname + nextUrl.search;
    } else {
      url = "";
    }
  }

  return allExhibitors;
}

export async function getExhibitor(org: PretixOrg, id: number): Promise<any> {
  return pretixFetch(org, `${orgPath(org)}/exhibitors/${id}/`);
}

export async function createExhibitor(org: PretixOrg, name: string): Promise<any> {
  return pretixFetch(org, `${orgPath(org)}/exhibitors/`, "POST", {
    name,
  });
}

function generateTagSlug(partnerName: string): string {
  return partnerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateVoucherCode(partnerName: string): string {
  const prefix = partnerName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${suffix}`;
}

export async function createVouchersForExhibitor(
  org: PretixOrg,
  exhibitorId: number,
  partnerName: string,
  partnershipLevel: string
): Promise<any[]> {
  const allocation = VOUCHER_ALLOCATIONS[partnershipLevel];
  if (!allocation) {
    throw new Error(`Invalid partnership level: ${partnershipLevel}`);
  }

  const { freeItemId, partnerItemId } = await getResolvedItemIds(org);
  const slug = generateTagSlug(partnerName);
  const base = orgPath(org);

  const freeVoucher = await pretixFetch(
    org,
    `${base}/vouchers/`,
    "POST",
    {
      code: generateVoucherCode(partnerName),
      max_usages: allocation.free,
      price_mode: "set",
      value: "0.00",
      item: freeItemId,
      tag: `${slug}-free`,
      comment: `Free ticket voucher for ${partnerName} (${partnershipLevel})`,
    }
  );

  const partnerVoucher = await pretixFetch(
    org,
    `${base}/vouchers/`,
    "POST",
    {
      code: generateVoucherCode(partnerName),
      max_usages: allocation.partner,
      price_mode: "set",
      value: "0.00",
      item: partnerItemId,
      tag: `${slug}-free-partner`,
      comment: `Partner ticket voucher for ${partnerName} (${partnershipLevel})`,
    }
  );

  const knightItemId = await findKnightItemId(org);
  const knightVoucher = await pretixFetch(
    org,
    `${base}/vouchers/`,
    "POST",
    {
      code: generateVoucherCode(partnerName),
      max_usages: KNIGHT_TICKET_MAX_USAGES,
      price_mode: "set",
      value: KNIGHT_TICKET_PRICE,
      item: knightItemId,
      tag: `${slug}-paid`,
      comment: `Knight ticket voucher for ${partnerName} (${partnershipLevel})`,
    }
  );

  const vouchers = [freeVoucher, partnerVoucher, knightVoucher];

  for (const voucher of vouchers) {
    let label = "Knight";
    if (voucher.id === freeVoucher.id) label = "Free";
    else if (voucher.id === partnerVoucher.id) label = "Partner";
    await pretixFetch(
      org,
      `${base}/exhibitors/${exhibitorId}/vouchers/attach/`,
      "POST",
      {
        id: voucher.id,
        exhibitor_comment: `${partnershipLevel} - ${label} ticket`,
      }
    );
  }

  return vouchers;
}

export async function getVoucherById(org: PretixOrg, voucherId: number): Promise<any> {
  return pretixFetch(org, `${orgPath(org)}/vouchers/${voucherId}/`);
}

export async function getExhibitorVouchers(org: PretixOrg, exhibitorId: number): Promise<any[]> {
  const linkedVouchers: any[] = [];
  let url = `${orgPath(org)}/exhibitors/${exhibitorId}/vouchers/`;

  while (url) {
    const data = await pretixFetch(org, url);
    linkedVouchers.push(...(data.results || []));
    if (data.next) {
      const nextUrl = new URL(data.next);
      url = nextUrl.pathname + nextUrl.search;
    } else {
      url = "";
    }
  }

  const fullVouchers = await Promise.all(
    linkedVouchers.map(async (stub: any) => {
      try {
        const full = await getVoucherById(org, stub.id);
        return { ...full, exhibitor_comment: stub.exhibitor_comment };
      } catch {
        return stub;
      }
    })
  );

  return fullVouchers;
}

export async function findKnightItemId(org: PretixOrg): Promise<number> {
  const items = await listItems(org);
  const knightItem = items.find((item: any) => {
    const name = typeof item.name === "object"
      ? (item.name.en || Object.values(item.name)[0] || "")
      : (item.name || "");
    return (name as string).toLowerCase().includes("knight");
  });
  if (!knightItem) {
    throw new Error(`Knight ticket item not found in Pretix for ${org.toUpperCase()}`);
  }
  return knightItem.id;
}

export async function listItems(org: PretixOrg): Promise<any[]> {
  const allItems: any[] = [];
  let url = `${orgPath(org)}/items/`;

  while (url) {
    const data = await pretixFetch(org, url);
    allItems.push(...(data.results || []));
    if (data.next) {
      const nextUrl = new URL(data.next);
      url = nextUrl.pathname + nextUrl.search;
    } else {
      url = "";
    }
  }

  return allItems;
}

export async function getOrderPositionsByVoucher(org: PretixOrg, voucherId: number): Promise<any[]> {
  const positions: any[] = [];
  let url = `${orgPath(org)}/orderpositions/?voucher=${voucherId}`;

  while (url) {
    const data = await pretixFetch(org, url);
    positions.push(...(data.results || []));
    if (data.next) {
      const nextUrl = new URL(data.next);
      url = nextUrl.pathname + nextUrl.search;
    } else {
      url = "";
    }
  }

  return positions;
}

export async function findExhibitorByName(org: PretixOrg, name: string): Promise<any | null> {
  const exhibitors = await listExhibitors(org);
  return exhibitors.find(
    (e: any) => e.name?.toLowerCase() === name.toLowerCase()
  ) || null;
}
