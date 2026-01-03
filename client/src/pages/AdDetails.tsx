import { useAd, useSyncAd, useDeleteAd } from "@/hooks/use-ads";
import { useParams, Link, useLocation } from "wouter";
import { 
  ArrowLeft, 
  RefreshCw, 
  Calendar, 
  Trash2, 
  ExternalLink,
  TrendingUp,
  Target,
  MousePointer2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/KPICard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function AdDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const adId = Number(id);
  const { data: ad, isLoading } = useAd(adId);
  const syncAd = useSyncAd();
  const deleteAd = useDeleteAd();

  if (isLoading) return <DetailsSkeleton />;
  if (!ad) return <div className="p-8 text-center">Ad not found</div>;

  const handleSync = () => {
    syncAd.mutate(adId);
  };

  const handleDelete = () => {
    deleteAd.mutate(adId, {
      onSuccess: () => setLocation('/')
    });
  };

  const reports = ad.reports || [];
  
  // Sort reports by date
  const sortedReports = [...reports].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Totals
  const totalSpend = reports.reduce((acc, r) => acc + r.spend, 0);
  const totalRevenue = reports.reduce((acc, r) => acc + r.revenue, 0);
  const totalImpressions = reports.reduce((acc, r) => acc + (r.impressions || 0), 0);
  const totalClicks = reports.reduce((acc, r) => acc + (r.clicks || 0), 0);
  const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-border/50 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold font-display flex items-center gap-2">
                {ad.name}
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider",
                  ad.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                )}>
                  {ad.status}
                </span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSync} 
              disabled={syncAd.isPending}
              className="border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", syncAd.isPending && "animate-spin")} />
              {syncAd.isPending ? "Syncing..." : "Sync Data"}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the ad campaign and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete Campaign
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Key Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title="Total Revenue" 
            value={formatCurrency(totalRevenue)}
            icon={<TrendingUp className="w-5 h-5" />}
            className="border-l-4 border-l-green-500"
          />
          <KPICard 
            title="Total Spend" 
            value={formatCurrency(totalSpend)}
            icon={<Target className="w-5 h-5" />}
            className="border-l-4 border-l-red-400"
          />
          <KPICard 
            title="Total Clicks" 
            value={totalClicks.toLocaleString()}
            subValue={`CTR: ${ctr.toFixed(2)}%`}
            icon={<MousePointer2 className="w-5 h-5" />}
            className="border-l-4 border-l-blue-400"
          />
          <KPICard 
            title="ROI" 
            value={`${roi.toFixed(1)}%`}
            icon={<Activity className="w-5 h-5" />}
            isPositive={roi > 0}
            trend={roi} // just strictly for color
            className="bg-primary/5 border-primary/20"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
             <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Performance Trends</h3>
                  <p className="text-sm text-muted-foreground">Daily Revenue vs Spend</p>
                </div>
             </div>
             <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedReports}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(new Date(val), 'dd/MM')}
                      stroke="#94A3B8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#94A3B8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `R$${val/100}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number) => [`R$ ${value/100}`, '']}
                      labelFormatter={(label) => format(new Date(label), 'PPP')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Revenue"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="spend" 
                      name="Spend"
                      stroke="#94A3B8" 
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">Daily Profit</h3>
            <div className="h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={sortedReports}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                   <XAxis dataKey="date" hide />
                   <Tooltip 
                     cursor={{fill: 'transparent'}}
                     content={({ active, payload }) => {
                       if (active && payload && payload.length) {
                         const data = payload[0].payload;
                         const profit = data.revenue - data.spend;
                         return (
                           <div className="bg-white p-3 rounded-lg shadow-lg border border-border">
                             <p className="font-bold mb-1">{format(new Date(data.date), 'dd MMM')}</p>
                             <p className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                               Profit: {formatCurrency(profit)}
                             </p>
                           </div>
                         );
                       }
                       return null;
                     }}
                   />
                   <Bar dataKey={(data) => data.revenue - data.spend} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border/50">
            <h3 className="text-lg font-bold">Daily Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/30">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Impressions</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clicks</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">CTR</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spend</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sortedReports.map((report) => {
                  const dayProfit = report.revenue - report.spend;
                  const dayRoas = report.spend > 0 ? report.revenue / report.spend : 0;
                  const dayCtr = (report.impressions || 0) > 0 ? ((report.clicks || 0) / (report.impressions || 1)) * 100 : 0;
                  
                  return (
                    <tr key={report.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {format(new Date(report.date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                        {report.impressions?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                        {report.clicks?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                        {dayCtr.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-foreground font-medium">
                        {formatCurrency(report.spend)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-bold">
                        {formatCurrency(report.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-xs font-bold",
                          dayRoas >= 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {dayRoas.toFixed(2)}x
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedReports.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              No daily data available yet. Click "Sync Data" to fetch latest reports.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50/50 p-8 space-y-8">
      <div className="flex justify-between items-center h-16 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <Skeleton className="h-[300px] w-full rounded-2xl" />
      </div>
    </div>
  );
}
