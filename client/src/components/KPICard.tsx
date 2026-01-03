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
}

export function KPICard({ title, value, icon, trend, trendLabel, className, subValue }: KPICardProps) {
  const isPositive = trend && trend >= 0;

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

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-3 bg-secondary/50 rounded-xl text-primary">
          {icon}
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center px-2 py-1 rounded-lg text-xs font-semibold border",
            isPositive 
              ? "bg-green-50 text-green-700 border-green-200" 
              : "bg-red-50 text-red-700 border-red-200"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      
      <div className="relative z-10">
        <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
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
