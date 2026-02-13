const PRETIX_BASE = "https://pretix.eu/api/v1";
const ORGANIZER = "techorama-be";
const EVENT = "2026";
const FREE_ITEM_ID = 907413;
const PARTNER_ITEM_ID = 907414;
const KNIGHT_TICKET_PRICE = "775.00";
const KNIGHT_TICKET_MAX_USAGES = 20;

export const VOUCHER_ALLOCATIONS: Record<string, { free: number; partner: number }> = {
  "Silver": { free: 1, partner: 2 },
  "Gold": { free: 2, partner: 3 },
  "Platinum": { free: 3, partner: 4 },
  "Ultimate": { free: 5, partner: 5 },
};

export async function pretixFetch(path: string, method: string = "GET", body?: any) {
  const apiKey = process.env.PRETIX_API_KEY;
  if (!apiKey) {
    throw new Error("PRETIX_API_KEY environment variable is not set");
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
    console.error(`Pretix API Error: ${response.status} ${text}`);
    throw new Error(`Pretix API returned ${response.status}: ${text}`);
  }

  return response.json();
}

export async function listExhibitors(): Promise<any[]> {
  const allExhibitors: any[] = [];
  let url = `/organizers/${ORGANIZER}/events/${EVENT}/exhibitors/`;

  while (url) {
    const data = await pretixFetch(url);
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

export async function getExhibitor(id: number): Promise<any> {
  return pretixFetch(`/organizers/${ORGANIZER}/events/${EVENT}/exhibitors/${id}/`);
}

export async function createExhibitor(name: string): Promise<any> {
  return pretixFetch(`/organizers/${ORGANIZER}/events/${EVENT}/exhibitors/`, "POST", {
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
  exhibitorId: number,
  partnerName: string,
  partnershipLevel: string
): Promise<any[]> {
  const allocation = VOUCHER_ALLOCATIONS[partnershipLevel];
  if (!allocation) {
    throw new Error(`Invalid partnership level: ${partnershipLevel}`);
  }

  const slug = generateTagSlug(partnerName);

  const freeVoucher = await pretixFetch(
    `/organizers/${ORGANIZER}/events/${EVENT}/vouchers/`,
    "POST",
    {
      code: generateVoucherCode(partnerName),
      max_usages: allocation.free,
      price_mode: "set",
      value: "0.00",
      item: FREE_ITEM_ID,
      tag: `${slug}-free`,
      comment: `Free ticket voucher for ${partnerName} (${partnershipLevel})`,
    }
  );

  const partnerVoucher = await pretixFetch(
    `/organizers/${ORGANIZER}/events/${EVENT}/vouchers/`,
    "POST",
    {
      code: generateVoucherCode(partnerName),
      max_usages: allocation.partner,
      price_mode: "set",
      value: "0.00",
      item: PARTNER_ITEM_ID,
      tag: `${slug}-free-partner`,
      comment: `Partner ticket voucher for ${partnerName} (${partnershipLevel})`,
    }
  );

  const knightItemId = await findKnightItemId();
  const knightVoucher = await pretixFetch(
    `/organizers/${ORGANIZER}/events/${EVENT}/vouchers/`,
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
      `/organizers/${ORGANIZER}/events/${EVENT}/exhibitors/${exhibitorId}/vouchers/attach/`,
      "POST",
      {
        id: voucher.id,
        exhibitor_comment: `${partnershipLevel} - ${label} ticket`,
      }
    );
  }

  return vouchers;
}

export async function getVoucherById(voucherId: number): Promise<any> {
  return pretixFetch(`/organizers/${ORGANIZER}/events/${EVENT}/vouchers/${voucherId}/`);
}

export async function getExhibitorVouchers(exhibitorId: number): Promise<any[]> {
  const linkedVouchers: any[] = [];
  let url = `/organizers/${ORGANIZER}/events/${EVENT}/exhibitors/${exhibitorId}/vouchers/`;

  while (url) {
    const data = await pretixFetch(url);
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
        const full = await getVoucherById(stub.id);
        return { ...full, exhibitor_comment: stub.exhibitor_comment };
      } catch {
        return stub;
      }
    })
  );

  return fullVouchers;
}

export async function findKnightItemId(): Promise<number> {
  const items = await listItems();
  const knightItem = items.find((item: any) => {
    const name = typeof item.name === "object"
      ? (item.name.en || Object.values(item.name)[0] || "")
      : (item.name || "");
    return (name as string).toLowerCase().includes("knight");
  });
  if (!knightItem) {
    throw new Error("Knight ticket item not found in Pretix");
  }
  return knightItem.id;
}

export async function listItems(): Promise<any[]> {
  const allItems: any[] = [];
  let url = `/organizers/${ORGANIZER}/events/${EVENT}/items/`;

  while (url) {
    const data = await pretixFetch(url);
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

export async function getOrderPositionsByVoucher(voucherId: number): Promise<any[]> {
  const positions: any[] = [];
  let url = `/organizers/${ORGANIZER}/events/${EVENT}/orderpositions/?voucher=${voucherId}`;

  while (url) {
    const data = await pretixFetch(url);
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

export async function findExhibitorByName(name: string): Promise<any | null> {
  const exhibitors = await listExhibitors();
  return exhibitors.find(
    (e: any) => e.name?.toLowerCase() === name.toLowerCase()
  ) || null;
}
