import { Shell } from "@/components/layout/Shell";
import { usePipelines } from "@/hooks/use-pipelines";
import { PipelineCard } from "@/components/pipelines/PipelineCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";

export default function Home() {
  const { data: pipelines, isLoading, error } = usePipelines();

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
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground text-lg">
              Welcome back. Here's what's happening in your Streak pipelines.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pipelines?.map((pipeline, idx) => (
            <motion.div
              key={pipeline.key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              <PipelineCard pipeline={pipeline} />
            </motion.div>
          ))}
          
          {(!pipelines || pipelines.length === 0) && (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-border rounded-xl">
              <p className="text-muted-foreground">No pipelines found.</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
