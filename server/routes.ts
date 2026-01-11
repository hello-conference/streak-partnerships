import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

const STREAK_API_BASE = "https://www.streak.com/api/v1";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Helper to fetch from Streak
  async function streakFetch(path: string) {
    const apiKey = process.env.STREAK_API_KEY;
    if (!apiKey) {
      throw new Error("STREAK_API_KEY environment variable is not set");
    }

    // Streak uses Basic Auth with the API key as the username
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

  app.get(api.pipelines.list.path, async (req, res) => {
    try {
      const pipelines = await streakFetch('/pipelines');
      // Format/Filter if necessary to match schema
      // Streak returns an array of pipeline objects
      res.json(pipelines);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || "Failed to fetch pipelines" });
    }
  });

  app.get(api.pipelines.get.path, async (req, res) => {
    try {
      const { key } = req.params;
      const pipeline = await streakFetch(`/pipelines/${key}`);
      res.json(pipeline);
    } catch (error: any) {
      res.status(404).json({ message: "Pipeline not found or error fetching" });
    }
  });

  app.get(api.pipelines.getBoxes.path, async (req, res) => {
    try {
      const { key } = req.params;
      const boxes = await streakFetch(`/pipelines/${key}/boxes`);
      
      // Also fetch the pipeline to get field definitions for resolving custom field values
      const pipeline = await streakFetch(`/pipelines/${key}`);
      
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
      const { value } = req.body;
      
      const apiKey = process.env.STREAK_API_KEY;
      if (!apiKey) {
        throw new Error("STREAK_API_KEY environment variable is not set");
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
