import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number; // percentage
  trendLabel?: string;
  className?: string;
  subValue?: string;
  isPositive?: boolean;
}

export function KPICard({ title, value, icon, trend, trendLabel, className, subValue, isPositive: isPositiveProp }: KPICardProps) {
  const isPositive = isPositiveProp ?? (trend !== undefined && trend >= 0);

  return (
    <div className={cn(
      "p-6 rounded-2xl glass-card relative overflow-hidden group",
      className
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300">
        <div className="transform scale-[2.5] origin-top-right text-foreground">
          {icon}
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-secondary/50 rounded-xl text-primary">
            {icon}
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        </div>
        
        <div className="text-3xl font-display font-bold text-foreground tracking-tight">
          {value}
        </div>
        {(subValue || trendLabel) && (
          <p className="text-xs text-muted-foreground mt-1">
            {subValue || trendLabel}
          </p>
        )}
      </div>
    </div>
  );
}
