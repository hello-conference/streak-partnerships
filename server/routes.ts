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
      res.json(boxes);
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

  return httpServer;
}
