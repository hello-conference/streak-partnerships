import type { Express, RequestHandler } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

// Allowed email domains for authentication
const ALLOWED_DOMAINS = ["techorama.be", "techorama.nl"];

// Middleware to check if user email is from allowed domains
const isDomainAllowed: RequestHandler = (req: any, res, next) => {
  const user = req.user as any;
  const email = user?.claims?.email;
  
  if (!email) {
    return res.status(403).json({ message: "Access denied: No email provided" });
  }
  
  const domain = email.split("@")[1]?.toLowerCase();
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return res.status(403).json({ 
      message: "Access denied: Only @techorama.be and @techorama.nl email addresses are allowed" 
    });
  }
  
  next();
};

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user (with domain validation)
  app.get("/api/auth/user", isAuthenticated, isDomainAllowed, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
