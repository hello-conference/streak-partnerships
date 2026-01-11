import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, LogIn, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Login() {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");
  
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">Techorama Partnerships</span>
        </div>
        
        <div className="flex-1 flex flex-col justify-center max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Partnership Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage and track partnership deals for Techorama conferences across Belgium and the Netherlands.
          </p>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Techorama Partnership Management
        </p>
      </div>
      
      <div className="lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md p-8">
          {error === "domain_not_allowed" && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Access denied. Only @techorama.be and @techorama.nl email addresses are allowed.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Welcome</h2>
            <p className="text-muted-foreground">
              Sign in with your Techorama account to continue
            </p>
          </div>
          
          <a href="/api/login" data-testid="button-login">
            <Button className="w-full" size="lg">
              <LogIn className="w-4 h-4 mr-2" />
              Sign in with Google
            </Button>
          </a>
          
          <p className="text-xs text-muted-foreground text-center mt-6">
            Only @techorama.be and @techorama.nl email addresses are allowed
          </p>
        </Card>
      </div>
    </div>
  );
}
