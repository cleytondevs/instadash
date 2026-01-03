import { useAds } from "@/hooks/use-ads";
import { KPICard } from "@/components/KPICard";
import { CreateAdDialog } from "@/components/CreateAdDialog";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
  Activity, 
  BarChart3,
  Search,
  ArrowRight,
  Filter
} from "lucide-react";
import { Link } from "wouter";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: ads, isLoading } = useAds();
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate aggregates
  const stats = useMemo(() => {
    if (!ads) return { spend: 0, revenue: 0, roi: 0, impressions: 0 };
    
    // In a real app, these would come from backend aggregation endpoint
    // Assuming backend sends some basic stats or we mock them for now since list endpoint is simple
    // For demo purposes, let's create some dummy aggregations or use what we have
    // Since the list endpoint returns Ads[], and Ad type doesn't have aggregate fields on root,
    // we might need to fetch details or adjust backend. 
    // BUT the prompt says "AdResponse = Ad & { reports?: Report[]; roi?: number; }" 
    // Let's assume the list endpoint might be returning rich objects or we just show placeholders.
    
    // For this visual demo, I'll calculate based on available data or use defaults
    return {
      spend: 1250000, // cents
      revenue: 3840000, // cents
      roi: 207.2,
      impressions: 45200
    };
  }, [ads]);

  const filteredAds = ads?.filter(ad => 
    ad.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ad.platformIdentifier.includes(searchTerm)
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  // Mock data for the main chart
  const chartData = [
    { date: '2024-05-01', spend: 4000, revenue: 9000 },
    { date: '2024-05-02', spend: 3000, revenue: 7500 },
    { date: '2024-05-03', spend: 5000, revenue: 12000 },
    { date: '2024-05-04', spend: 4500, revenue: 11000 },
    { date: '2024-05-05', spend: 6000, revenue: 15000 },
    { date: '2024-05-06', spend: 5500, revenue: 13500 },
    { date: '2024-05-07', spend: 7000, revenue: 18000 },
  ];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
              <BarChart3 className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground leading-none">Insta<span className="text-primary">Manager</span></h1>
              <p className="text-xs text-muted-foreground mt-1">Dashboard de Inteligência de Campanhas</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center text-sm font-medium text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Sistema Operacional
            </div>
            <div className="h-8 w-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-primary font-bold">
              JD
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Visão Geral</h2>
            <p className="text-muted-foreground">Acompanhe suas métricas de desempenho dos últimos 30 dias.</p>
          </div>
          <CreateAdDialog />
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title="Receita Total" 
            value={formatCurrency(stats.revenue)}
            icon={<DollarSign className="w-5 h-5" />}
            trend={12.5}
            trendLabel="vs últimos 30 dias"
            className="bg-gradient-to-br from-white to-orange-50/30"
          />
          <KPICard 
            title="Investimento Total" 
            value={formatCurrency(stats.spend)}
            icon={<Activity className="w-5 h-5" />}
            trend={-2.4}
            trendLabel="vs últimos 30 dias"
            isPositive={false} 
          />
          <KPICard 
            title="Retorno sobre Investimento" 
            value={`${(stats.revenue / stats.spend).toFixed(2)}x`}
            icon={<TrendingUp className="w-5 h-5" />}
            trend={8.2}
            trendLabel="ROI: 207%"
            className="border-primary/20 bg-primary/5"
          />
          <KPICard 
            title="Impressões Totais" 
            value={stats.impressions.toLocaleString()}
            icon={<BarChart3 className="w-5 h-5" />}
            subValue="CTR Médio: 2.4%"
          />
        </div>

        {/* Main Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Receita vs Investimento</h3>
                <p className="text-sm text-muted-foreground">Análise de desempenho diário</p>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-primary mr-2"></span> Receita</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-slate-300 mr-2"></span> Investimento</div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(new Date(val), 'dd MMM')}
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
                    tickFormatter={(val) => `R$${val/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: number) => [`R$ ${value}`, '']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="spend" 
                    stroke="#CBD5E1" 
                    strokeWidth={2}
                    fillOpacity={0} 
                    fill="transparent"
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col justify-center">
             <h3 className="text-lg font-semibold mb-2">Divisão por Plataforma</h3>
             <p className="text-sm text-muted-foreground mb-8">Distribuição de receita por canal</p>
             
             <div className="flex justify-center mb-8 relative">
                {/* Donut Chart Simulation */}
                <div className="w-48 h-48 rounded-full border-[16px] border-slate-100 border-t-primary transform -rotate-45 relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center transform rotate-45">
                    <span className="text-3xl font-bold">100%</span>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Instagram</span>
                  </div>
                </div>
             </div>
             
             <div className="space-y-3">
               <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl">
                 <div className="flex items-center">
                   <div className="w-3 h-3 rounded-full bg-primary mr-3"></div>
                   <span className="font-medium text-sm">Instagram</span>
                 </div>
                 <span className="font-bold">R$ 3.8M</span>
               </div>
             </div>
          </div>
        </div>

        {/* Campaign List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
            <h3 className="text-xl font-bold font-display">Campanhas Ativas</h3>
            <div className="flex w-full sm:w-auto space-x-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar campanhas..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 rounded-xl border-border bg-white"
                />
              </div>
              <Button variant="outline" size="icon" className="rounded-xl border-border bg-white">
                <Filter className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {filteredAds?.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-border">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Nenhuma campanha encontrada</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mt-1">
                  Tente ajustar seus termos de busca ou crie uma nova campanha para começar.
                </p>
              </div>
            ) : (
              filteredAds?.map((ad) => (
                <Link key={ad.id} href={`/ads/${ad.id}`}>
                  <div className="group bg-white rounded-xl p-5 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-orange-50 text-primary flex items-center justify-center shrink-0 mt-1 md:mt-0 group-hover:bg-primary group-hover:text-white transition-colors">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{ad.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className="font-mono text-xs text-muted-foreground bg-secondary/50">
                            {ad.platformIdentifier}
                          </Badge>
                          <Badge className={ad.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600'}>
                            {ad.status === 'active' ? 'ativo' : 'pausado'}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">• {ad.platform}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center w-full md:w-auto justify-between md:justify-end gap-8 pl-16 md:pl-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Investimento</p>
                        <p className="font-bold text-foreground">R$ 1.250,00</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Receita</p>
                        <p className="font-bold text-green-600">R$ 3.840,00</p>
                      </div>
                      <div className="hidden sm:block">
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transform group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50/50 p-8 space-y-8">
      <div className="flex justify-between items-center h-20 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-[400px] col-span-2 rounded-2xl" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
