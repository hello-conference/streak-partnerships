import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import * as XLSX from "xlsx";
import { listExhibitors, findExhibitorByName, createExhibitor, createVouchersForExhibitor, getExhibitor, getExhibitorVouchers, listItems, getOrderPositionsByVoucher, VOUCHER_ALLOCATIONS, getResolvedItemIds, type PretixOrg } from "./pretix";

const STREAK_API_BASE = "https://www.streak.com/api/v1";

// Allowed email domains for authentication
const ALLOWED_DOMAINS = ["techorama.be", "techorama.nl"];

// Known NL pipeline keys (will be populated after first fetch)
const NL_PIPELINE_KEYS = new Set<string>();

// Detect NL pipelines by checking if key contains "techorama.nl" (base64 encoded)
function isNLPipeline(pipelineKey: string): boolean {
  if (NL_PIPELINE_KEYS.has(pipelineKey)) return true;
  // The key contains "dGVjaG9yYW1hLm5s" which is base64 for "techorama.nl"
  return pipelineKey.includes("dGVjaG9yYW1hLm5s");
}

// Middleware to check if user email is from allowed domains
function isDomainAllowed(req: any, res: any, next: any) {
  const user = req.user as any;
  const email = user?.claims?.email;
  
  if (!email) {
    return res.status(403).json({ message: "Access denied: No email provided" });
  }
  
  const domain = email.split("@")[1]?.toLowerCase();
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return res.status(403).json({ 
      message: `Access denied: Only @techorama.be and @techorama.nl email addresses are allowed` 
    });
  }
  
  next();
}

// Check if user can access a specific pipeline based on email domain
// .be users can access both BE and NL pipelines
// .nl users can only access NL pipelines
function canAccessPipeline(email: string, pipelineKey: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (domain === "techorama.be") {
    return true; // BE users can access all pipelines
  }
  // NL users can only access NL pipelines
  return isNLPipeline(pipelineKey);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup authentication (must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Helper to fetch from Streak with specific API key
  async function streakFetchWithKey(path: string, apiKey: string) {
    const auth = Buffer.from(`${apiKey}:`).toString('base64');
    
    const response = await fetch(`${STREAK_API_BASE}${path}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Streak API Error: ${response.status} ${text}`);
      throw new Error(`Streak API returned ${response.status}: ${text}`);
    }

    return response.json();
  }

  // Helper to fetch from Streak (BE by default)
  async function streakFetch(path: string) {
    const apiKey = process.env.STREAK_API_KEY;
    if (!apiKey) {
      throw new Error("STREAK_API_KEY environment variable is not set");
    }
    return streakFetchWithKey(path, apiKey);
  }

  // Helper to fetch from Streak NL
  async function streakFetchNL(path: string) {
    const apiKey = process.env.STREAK_API_KEY_NL;
    if (!apiKey) {
      throw new Error("STREAK_API_KEY_NL environment variable is not set");
    }
    return streakFetchWithKey(path, apiKey);
  }

  // Helper to fetch from Streak v2 API (for contacts)
  async function streakFetchV2(path: string, apiKey: string) {
    const auth = Buffer.from(`${apiKey}:`).toString('base64');
    
    const response = await fetch(`https://api.streak.com/api/v2${path}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Streak API v2 returned ${response.status}: ${text}`);
    }

    return response.json();
  }

  // Determine which API key to use based on pipeline key
  function getStreakFetcher(pipelineKey: string) {
    return isNLPipeline(pipelineKey) ? streakFetchNL : streakFetch;
  }

  // Protected API routes - require authentication and domain check
  app.get(api.pipelines.list.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const email = req.user?.claims?.email;
      const domain = email?.split("@")[1]?.toLowerCase();
      const canViewBE = domain === "techorama.be";
      
      // Fetch pipelines based on user permissions
      // .be users can view both, .nl users can only view NL
      const [bePipelines, nlPipelines] = await Promise.all([
        canViewBE ? streakFetch('/pipelines').catch(() => []) : Promise.resolve([]),
        streakFetchNL('/pipelines').catch(() => [])
      ]);
      
      // Track NL pipeline keys for routing
      nlPipelines.forEach((p: any) => NL_PIPELINE_KEYS.add(p.key));
      
      // Combine and return all pipelines
      res.json([...bePipelines, ...nlPipelines]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to fetch pipelines" });
    }
  });

  app.get(api.pipelines.get.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const { key } = req.params;
      const email = req.user?.claims?.email;
      
      // Check pipeline access permission
      if (!canAccessPipeline(email, key)) {
        return res.status(403).json({ message: "Access denied: You don't have permission to view this pipeline" });
      }
      
      const fetcher = getStreakFetcher(key);
      const pipeline = await fetcher(`/pipelines/${key}`);
      res.json(pipeline);
    } catch (error: any) {
      res.status(404).json({ message: "Pipeline not found or error fetching" });
    }
  });

  app.get(api.pipelines.getBoxes.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const { key } = req.params;
      const email = req.user?.claims?.email;
      
      // Check pipeline access permission
      if (!canAccessPipeline(email, key)) {
        return res.status(403).json({ message: "Access denied: You don't have permission to view this pipeline" });
      }
      
      const fetcher = getStreakFetcher(key);
      const boxes = await fetcher(`/pipelines/${key}/boxes`);
      
      // Also fetch the pipeline to get field definitions for resolving custom field values
      const pipeline = await fetcher(`/pipelines/${key}`);
      
      // Find the Partnership field and its option mappings
      const partnershipField = pipeline.fields?.find((f: any) => 
        f.name?.toLowerCase().includes("partnership")
      );
      
      // Find the "Partner Page Live" field (checkbox/boolean field)
      const partnerPageLiveField = pipeline.fields?.find((f: any) => 
        f.name?.toLowerCase().includes("partner page live")
      );
      const partnerPageLiveFieldKey = partnerPageLiveField?.key;
      
      // Build a mapping of field option keys to their display names
      const fieldOptionMap: Record<string, string> = {};
      if (partnershipField?.fieldOptions) {
        partnershipField.fieldOptions.forEach((option: any) => {
          fieldOptionMap[option.key] = option.name;
        });
      }
      
      // Resolve numeric field references to actual values in each box
      const resolvedBoxes = await Promise.all(boxes.map(async (box: any) => {
        if (box.fields && box.fields["1001"] && fieldOptionMap[box.fields["1001"]]) {
          box.fields["1001_resolved"] = fieldOptionMap[box.fields["1001"]];
        }
        // Resolve Partner Page Live field to a standardized key
        if (partnerPageLiveFieldKey && box.fields && box.fields[partnerPageLiveFieldKey] !== undefined) {
          box.fields["partnerPageLive"] = box.fields[partnerPageLiveFieldKey] === true;
        } else {
          box.fields = box.fields || {};
          box.fields["partnerPageLive"] = false;
        }
        
        // Fetch linked contacts from the box's contacts array using v2 API
        const contacts: { name: string | null; email: string | null; phone: string | null }[] = [];
        const apiKey = isNLPipeline(key) ? process.env.STREAK_API_KEY_NL : process.env.STREAK_API_KEY;
        
        // The box.contacts array contains contact keys that need to be fetched via v2 API
        const boxContactKeys = (box.contacts || []).map((c: any) => c.key).filter(Boolean);
        
        for (const contactKey of boxContactKeys) {
          try {
            const contactData = await streakFetchV2(`/contacts/${contactKey}`, apiKey!);
            
            // Extract email from emailAddresses array
            const emails = contactData.emailAddresses || [];
            const primaryEmail = emails[0] || null;
            
            // Build contact name from given and family names
            const givenName = contactData.givenName || '';
            const familyName = contactData.familyName || '';
            const fullName = [givenName, familyName].filter(Boolean).join(' ') || null;
            
            if (primaryEmail) {
              contacts.push({
                name: fullName,
                email: primaryEmail,
                phone: contactData.phoneNumbers?.[0] || null
              });
            }
          } catch (err) {
            console.error(`Failed to fetch contact ${contactKey}:`, err);
          }
        }
        
        box.contacts = contacts;
        
        return box;
      }));
      
      res.json(resolvedBoxes);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch boxes" });
    }
  });

  app.get(api.boxes.get.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const { key } = req.params;
      const email = req.user?.claims?.email;
      
      // Try to fetch the box from BE first, then NL if not found
      let box = null;
      let pipelineKey = null;
      
      try {
        box = await streakFetch(`/boxes/${key}`);
        pipelineKey = box?.pipelineKey;
      } catch {
        // Try NL API if BE fails
        try {
          box = await streakFetchNL(`/boxes/${key}`);
          pipelineKey = box?.pipelineKey;
        } catch {
          return res.status(404).json({ message: "Box not found" });
        }
      }
      
      // Check pipeline access permission
      if (pipelineKey && !canAccessPipeline(email, pipelineKey)) {
        return res.status(403).json({ message: "Access denied: You don't have permission to view this box" });
      }
      
      res.json(box);
    } catch (error: any) {
      res.status(404).json({ message: "Box not found" });
    }
  });

  // Update a box field in Streak
  app.post(api.boxes.updateField.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const { key, fieldKey } = req.params;
      const { value } = req.body;
      const email = req.user?.claims?.email;
      
      // Fetch the box first to get its actual pipeline key (server-side validation)
      let box = null;
      let actualPipelineKey = null;
      let isNL = false;
      
      try {
        box = await streakFetch(`/boxes/${key}`);
        actualPipelineKey = box?.pipelineKey;
        isNL = false;
      } catch {
        // Try NL API if BE fails
        try {
          box = await streakFetchNL(`/boxes/${key}`);
          actualPipelineKey = box?.pipelineKey;
          isNL = true;
        } catch {
          return res.status(404).json({ message: "Box not found" });
        }
      }
      
      if (!actualPipelineKey) {
        return res.status(400).json({ message: "Could not determine pipeline for this box" });
      }
      
      // Check pipeline access permission using the ACTUAL pipeline key (not client-supplied)
      if (!canAccessPipeline(email, actualPipelineKey)) {
        return res.status(403).json({ message: "Access denied: You don't have permission to modify this pipeline" });
      }
      
      // Use the appropriate API key based on actual pipeline
      const apiKey = isNL ? process.env.STREAK_API_KEY_NL : process.env.STREAK_API_KEY;
      
      if (!apiKey) {
        throw new Error(`STREAK_API_KEY${isNL ? '_NL' : ''} environment variable is not set`);
      }

      const auth = Buffer.from(`${apiKey}:`).toString('base64');
      
      // Streak API to update a field value on a box
      const response = await fetch(`${STREAK_API_BASE}/boxes/${key}/fields/${fieldKey}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`Streak API Error: ${response.status} ${text}`);
        throw new Error(`Streak API returned ${response.status}: ${text}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to update field" });
    }
  });

  // Export partner contacts to Excel
  app.get(api.boxes.exportContacts.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const { key } = req.params;
      const email = req.user?.claims?.email;
      
      // Check pipeline access permission
      if (!canAccessPipeline(email, key)) {
        return res.status(403).json({ message: "Access denied: You don't have permission to export from this pipeline" });
      }

      const fetcher = getStreakFetcher(key);
      const pipeline = await fetcher(`/pipelines/${key}`);
      const boxes = await fetcher(`/pipelines/${key}/boxes`);

      // Build stages map - stages can be an array or an object
      const stagesMap: Record<string, string> = {};
      if (pipeline.stages) {
        if (Array.isArray(pipeline.stages)) {
          for (const stage of pipeline.stages) {
            stagesMap[stage.key] = stage.name;
          }
        } else if (typeof pipeline.stages === 'object') {
          for (const [stageKey, stage] of Object.entries(pipeline.stages)) {
            stagesMap[stageKey] = (stage as any).name || stageKey;
          }
        }
      }

      // Build partnership package map
      const fieldMap: Record<string, string> = {
        "9001": "Ultimate",
        "9002": "Platinum", 
        "9003": "Gold",
        "9004": "Silver"
      };

      const apiKey = isNLPipeline(key) ? process.env.STREAK_API_KEY_NL : process.env.STREAK_API_KEY;

      // Process each box and fetch contacts
      const exportData: { 
        partnerName: string; 
        partnershipPackage: string; 
        partnershipStage: string; 
        contactEmails: string; 
      }[] = [];

      for (const box of boxes) {
        // Get partnership package
        let partnershipPackage = "";
        if (box.fields?.["1001"]) {
          const val = box.fields["1001"];
          if (typeof val === "string" && fieldMap[val]) {
            partnershipPackage = fieldMap[val];
          }
        }

        // Get stage name
        const stageName = box.stageKey ? (stagesMap[box.stageKey] || "") : "";

        // Fetch contacts for this box using v2 API
        const boxContactKeys = (box.contacts || []).map((c: any) => c.key).filter(Boolean);
        const contactEmails: string[] = [];

        for (const contactKey of boxContactKeys) {
          try {
            const contactData = await streakFetchV2(`/contacts/${contactKey}`, apiKey!);
            const emails = contactData.emailAddresses || [];
            if (emails[0]) {
              contactEmails.push(emails[0]);
            }
          } catch (err) {
            console.error(`Failed to fetch contact ${contactKey}:`, err);
          }
        }

        exportData.push({
          partnerName: box.name || "",
          partnershipPackage,
          partnershipStage: stageName,
          contactEmails: contactEmails.join(", ")
        });
      }

      // Create Excel workbook
      const ws = XLSX.utils.json_to_sheet(exportData, {
        header: ["partnerName", "partnershipPackage", "partnershipStage", "contactEmails"]
      });
      
      // Set column headers
      ws["A1"] = { v: "Partner Name", t: "s" };
      ws["B1"] = { v: "Partnership Package", t: "s" };
      ws["C1"] = { v: "Partnership Stage", t: "s" };
      ws["D1"] = { v: "Partnership Contacts (Email)", t: "s" };

      // Set column widths
      ws["!cols"] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 20 },
        { wch: 50 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Partner Contacts");

      // Generate buffer
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      // Send file
      const fileName = `partner-contacts-${pipeline.name?.replace(/\s+/g, '-') || key}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to export contacts" });
    }
  });

  // Pretix API routes - org parameter determines BE or NL
  function parseOrg(req: any): PretixOrg {
    const org = req.params.org;
    if (org !== "be" && org !== "nl") throw new Error("Invalid org");
    return org;
  }

  app.get(api.pretix.getExhibitors.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const org = parseOrg(req);
      const { freeItemId, partnerItemId } = await getResolvedItemIds(org);
      const exhibitors = await listExhibitors(org);
      const enriched = await Promise.all(
        exhibitors.map(async (exhibitor: any) => {
          try {
            const vouchers = await getExhibitorVouchers(org, exhibitor.id);
            let freeTotal = 0;
            let freeClaimed = 0;
            let paidTotal = 0;
            let paidClaimed = 0;
            for (const v of vouchers) {
              const tag = (v.tag || "").toLowerCase();
              const isFree = v.item === freeItemId || v.item === partnerItemId
                || tag.includes("-free");
              if (isFree) {
                freeTotal += v.max_usages || 0;
                freeClaimed += v.redeemed || 0;
              } else {
                paidTotal += v.max_usages || 0;
                paidClaimed += v.redeemed || 0;
              }
            }
            return { ...exhibitor, freeTotal, freeClaimed, paidTotal, paidClaimed };
          } catch {
            return { ...exhibitor, freeTotal: 0, freeClaimed: 0 };
          }
        })
      );
      res.json(enriched);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to fetch exhibitors" });
    }
  });

  app.get(api.pretix.getExhibitorByName.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const org = parseOrg(req);
      const { name } = req.params;
      const exhibitor = await findExhibitorByName(org, decodeURIComponent(name));
      if (!exhibitor) {
        return res.status(404).json({ message: "Exhibitor not found" });
      }
      const vouchers = await getExhibitorVouchers(org, exhibitor.id);
      res.json({ ...exhibitor, vouchers });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to find exhibitor" });
    }
  });

  app.post(api.pretix.createMissingExhibitors.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const org = parseOrg(req);
      const { partners } = req.body;
      if (!partners || !Array.isArray(partners) || partners.length === 0) {
        return res.status(400).json({ message: "partners array is required" });
      }
      const existingExhibitors = await listExhibitors(org);
      const existingNames = new Set(existingExhibitors.map((e: any) => e.name?.toLowerCase()));

      const results: any[] = [];
      const errors: any[] = [];

      for (const partner of partners) {
        const { name, partnershipLevel } = partner;
        if (existingNames.has(name.toLowerCase())) {
          continue;
        }
        if (!VOUCHER_ALLOCATIONS[partnershipLevel]) {
          errors.push({ name, error: `Invalid partnership level: ${partnershipLevel}` });
          continue;
        }
        try {
          const exhibitor = await createExhibitor(org, name);
          const vouchers = await createVouchersForExhibitor(org, exhibitor.id, name, partnershipLevel);
          results.push({ name, exhibitor: { ...exhibitor, vouchers } });
          existingNames.add(name.toLowerCase());
        } catch (err: any) {
          errors.push({ name, error: err.message || "Failed to create" });
        }
      }

      res.json({ created: results, errors, skipped: partners.length - results.length - errors.length });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to batch create exhibitors" });
    }
  });

  app.post(api.pretix.createExhibitor.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const org = parseOrg(req);
      const { name, partnershipLevel } = req.body;
      if (!name || !partnershipLevel) {
        return res.status(400).json({ message: "name and partnershipLevel are required" });
      }
      if (!VOUCHER_ALLOCATIONS[partnershipLevel]) {
        return res.status(400).json({ message: `Invalid partnership level: ${partnershipLevel}. Must be one of: ${Object.keys(VOUCHER_ALLOCATIONS).join(", ")}` });
      }
      const exhibitor = await createExhibitor(org, name);
      const vouchers = await createVouchersForExhibitor(org, exhibitor.id, name, partnershipLevel);
      res.status(201).json({ ...exhibitor, vouchers });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to create exhibitor" });
    }
  });

  app.get(api.pretix.getExhibitorVouchers.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const org = parseOrg(req);
      const { id } = req.params;
      const vouchers = await getExhibitorVouchers(org, parseInt(id));
      res.json(vouchers);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to fetch exhibitor vouchers" });
    }
  });

  app.get(api.pretix.getItems.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const org = parseOrg(req);
      const items = await listItems(org);
      res.json(items);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to fetch items" });
    }
  });

  app.get(api.pretix.getTicketSummary.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const org = parseOrg(req);
      const { freeItemId, partnerItemId } = await getResolvedItemIds(org);
      const exhibitors = await listExhibitors(org);
      let totalFreeConference = 0;
      let claimedFreeConference = 0;
      let totalPartner = 0;
      let claimedPartner = 0;
      let totalPaid = 0;
      let claimedPaid = 0;
      let totalPaidRevenue = 0;

      await Promise.all(
        exhibitors.map(async (exhibitor: any) => {
          try {
            const vouchers = await getExhibitorVouchers(org, exhibitor.id);
            for (const v of vouchers) {
              if (v.item === freeItemId) {
                totalFreeConference += v.max_usages || 0;
                claimedFreeConference += v.redeemed || 0;
              } else if (v.item === partnerItemId) {
                totalPartner += v.max_usages || 0;
                claimedPartner += v.redeemed || 0;
              } else {
                totalPaid += v.max_usages || 0;
                claimedPaid += v.redeemed || 0;
                const price = parseFloat(v.value || "0");
                totalPaidRevenue += (v.redeemed || 0) * price;
              }
            }
          } catch {}
        })
      );

      res.json({
        freeConference: { total: totalFreeConference, claimed: claimedFreeConference },
        partner: { total: totalPartner, claimed: claimedPartner },
        paid: { total: totalPaid, claimed: claimedPaid },
        paidRevenue: totalPaidRevenue,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to compute ticket summary" });
    }
  });

  app.get(api.pretix.getExhibitorById.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const org = parseOrg(req);
      const { id } = req.params;
      const exhibitor = await getExhibitor(org, parseInt(id));
      const vouchers = await getExhibitorVouchers(org, parseInt(id));
      const vouchersWithPositions = await Promise.all(
        vouchers.map(async (voucher: any) => {
          const isFree = (voucher.price_mode === "set" && parseFloat(voucher.value || "0") === 0)
            || voucher.price_mode === "none" || !voucher.price_mode;
          const isPaid = !isFree;
          if (isPaid && voucher.redeemed > 0) {
            try {
              const positions = await getOrderPositionsByVoucher(org, voucher.id);
              return { ...voucher, order_positions: positions };
            } catch {
              return voucher;
            }
          }
          return voucher;
        })
      );
      res.json({ ...exhibitor, vouchers: vouchersWithPositions });
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("404")) {
        return res.status(404).json({ message: "Exhibitor not found" });
      }
      res.status(500).json({ message: error.message || "Failed to fetch exhibitor" });
    }
  });

  app.get(api.pretix.getEmailLogs.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const org = parseOrg(req);
      const { id } = req.params;
      const logs = await storage.getEmailLogsByExhibitor(org, String(id));
      res.json(logs);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to fetch email logs" });
    }
  });

  app.post(api.pretix.createEmailLog.path, isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const org = parseOrg(req);
      const { id } = req.params;
      const { sentTo, subject, exhibitorName } = req.body;
      if (!sentTo || !subject || !exhibitorName) {
        return res.status(400).json({ message: "sentTo, subject, and exhibitorName are required" });
      }
      const user = req.user as any;
      const sentBy = user?.claims?.email || "unknown";
      const log = await storage.createEmailLog({
        org,
        exhibitorId: String(id),
        exhibitorName,
        sentTo,
        sentBy,
        subject,
      });
      res.status(201).json(log);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to create email log" });
    }
  });

  return httpServer;
}
