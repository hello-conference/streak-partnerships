import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

const STREAK_API_BASE = "https://www.streak.com/api/v1";

// Known NL pipeline keys (will be populated after first fetch)
const NL_PIPELINE_KEYS = new Set<string>();

// Detect NL pipelines by checking if key contains "techorama.nl" (base64 encoded)
function isNLPipeline(pipelineKey: string): boolean {
  if (NL_PIPELINE_KEYS.has(pipelineKey)) return true;
  // The key contains "dGVjaG9yYW1hLm5s" which is base64 for "techorama.nl"
  return pipelineKey.includes("dGVjaG9yYW1hLm5s");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

  // Determine which API key to use based on pipeline key
  function getStreakFetcher(pipelineKey: string) {
    return isNLPipeline(pipelineKey) ? streakFetchNL : streakFetch;
  }

  app.get(api.pipelines.list.path, async (req, res) => {
    try {
      // Fetch from both BE and NL APIs
      const [bePipelines, nlPipelines] = await Promise.all([
        streakFetch('/pipelines').catch(() => []),
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

  app.get(api.pipelines.get.path, async (req, res) => {
    try {
      const { key } = req.params;
      const fetcher = getStreakFetcher(key);
      const pipeline = await fetcher(`/pipelines/${key}`);
      res.json(pipeline);
    } catch (error: any) {
      res.status(404).json({ message: "Pipeline not found or error fetching" });
    }
  });

  app.get(api.pipelines.getBoxes.path, async (req, res) => {
    try {
      const { key } = req.params;
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
      const resolvedBoxes = boxes.map((box: any) => {
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
        return box;
      });
      
      res.json(resolvedBoxes);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch boxes" });
    }
  });

  app.get(api.boxes.get.path, async (req, res) => {
    try {
      const { key } = req.params;
      const box = await streakFetch(`/boxes/${key}`);
      res.json(box);
    } catch (error: any) {
      res.status(404).json({ message: "Box not found" });
    }
  });

  // Update a box field in Streak
  app.post(api.boxes.updateField.path, async (req, res) => {
    try {
      const { key, fieldKey } = req.params;
      const { value, pipelineKey } = req.body;
      
      // Use the appropriate API key based on pipeline
      const isNL = pipelineKey && isNLPipeline(pipelineKey);
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

  return httpServer;
}
