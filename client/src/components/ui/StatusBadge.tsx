import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Generate a consistent color based on the status string hash
  const getColors = (str: string) => {
    const colors = [
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-green-100 text-green-700 border-green-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-amber-100 text-amber-700 border-amber-200",
      "bg-pink-100 text-pink-700 border-pink-200",
      "bg-indigo-100 text-indigo-700 border-indigo-200",
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm truncate max-w-[120px]",
      getColors(status),
      className
    )}>
      {status}
    </span>
  );
}
