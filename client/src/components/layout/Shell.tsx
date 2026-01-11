import { ReactNode } from "react";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main className="overflow-y-auto overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
