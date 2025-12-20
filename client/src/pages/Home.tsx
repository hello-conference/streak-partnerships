import { useEffect } from "react";
import { useNavigate } from "wouter";
import { usePipelines } from "@/hooks/use-pipelines";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Shell } from "@/components/layout/Shell";

const PARTNER_2026_NAME = "Partners 2026 BE";

export default function Home() {
  const [, navigate] = useNavigate();
  const { data: pipelines, isLoading, error } = usePipelines();

  useEffect(() => {
    if (pipelines && pipelines.length > 0) {
      const targetPipeline = pipelines.find(p => p.name === PARTNER_2026_NAME);
      if (targetPipeline) {
        navigate(`/pipelines/${targetPipeline.key}`);
      }
    }
  }, [pipelines, navigate]);

  if (isLoading) {
    return (
      <Shell>
        <LoadingSpinner />
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="p-8 bg-destructive/10 text-destructive rounded-xl border border-destructive/20">
          <h2 className="text-lg font-bold mb-2">Error Loading Pipelines</h2>
          <p>{error.message}</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Loading Partners 2026 BE...</p>
      </div>
    </Shell>
  );
}
