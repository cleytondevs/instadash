import { useAd, useSyncAd, useDeleteAd } from "@/hooks/use-ads";
import { useParams, Link, useLocation } from "wouter";
import { 
  ArrowLeft, 
  RefreshCw, 
  Trash2, 
  TrendingUp,
  Target,
  MousePointer2,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import type { AdResponse } from "@shared/schema";

export default function AdDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const adId = Number(id);
  const { data: ad, isLoading } = useAd(adId) as { data: AdResponse | undefined, isLoading: boolean };
  const syncAd = useSyncAd();
  const deleteAd = useDeleteAd();

  if (isLoading) return <DetailsSkeleton />;
  if (!ad) return <div className="p-8 text-center text-gray-500">Anúncio não encontrado</div>;

  const handleSync = () => {
    syncAd.mutate(adId);
  };

  const handleDelete = () => {
    deleteAd.mutate(adId, {
      onSuccess: () => setLocation('/')
    });
  };

  const reports = ad.reports || [];
  
  const sortedReports = [...reports].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

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

  const isPositive = roi >= 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                {ad.name}
                <Badge variant={ad.status === 'active' ? 'default' : 'secondary'} className={ad.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                  {ad.status === 'active' ? 'Ativo' : 'Pausado'}
                </Badge>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSync} 
              disabled={syncAd.isPending}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", syncAd.isPending && "animate-spin")} />
              {syncAd.isPending ? "Sincronizando..." : "Sincronizar Dados"}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente a campanha e todos os dados associados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
                    Excluir Campanha
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title="Receita Total" 
            value={formatCurrency(totalRevenue)}
            icon={<TrendingUp className="w-5 h-5" />}
            className="bg-white border-gray-200"
          />
          <KPICard 
            title="Investimento Total" 
            value={formatCurrency(totalSpend)}
            icon={<Target className="w-5 h-5" />}
            className="bg-white border-gray-200"
          />
          <KPICard 
            title="Cliques Totais" 
            value={totalClicks.toLocaleString()}
            subValue={`CTR: ${ctr.toFixed(2)}%`}
            icon={<MousePointer2 className="w-5 h-5" />}
            className="bg-white border-gray-200"
          />
          <KPICard 
            title="ROI" 
            value={`${roi.toFixed(1)}%`}
            icon={<Activity className="w-5 h-5" />}
            isPositive={isPositive}
            trend={roi}
            className={isPositive ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-red-50 border-red-100 text-red-900'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Tendências de Desempenho</h3>
                  <p className="text-sm text-gray-500">Receita Diária vs Investimento</p>
                </div>
             </div>
             <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedReports}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(new Date(val), 'dd/MM', { locale: ptBR })}
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
                      labelFormatter={(label) => format(new Date(label), 'PPP', { locale: ptBR })}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Receita"
                      stroke="#10B981" 
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="spend" 
                      name="Investimento"
                      stroke="#94A3B8" 
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Lucro Diário</h3>
            <div className="h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={sortedReports}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                   <XAxis dataKey="date" hide />
                   <Tooltip 
                     cursor={{fill: 'transparent'}}
                     content={({ active, payload }) => {
                       if (active && payload && payload.length) {
                         const data = payload[0].payload;
                         const profit = data.revenue - data.spend;
                         return (
                           <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100">
                             <p className="font-bold text-gray-900 mb-1">{format(new Date(data.date), 'dd MMM', { locale: ptBR })}</p>
                             <p className={profit >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                               Lucro: {formatCurrency(profit)}
                             </p>
                           </div>
                         );
                       }
                       return null;
                     }}
                   />
                   <Bar dataKey={(data) => data.revenue - data.spend} fill="#3B82F6" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200 bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-900">Detalhamento Diário</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Cliques</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">CTR</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Investimento</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Receita</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      Nenhum dado diário disponível.
                    </td>
                  </tr>
                ) : (
                  sortedReports.map((report) => {
                    const dayRoas = report.spend > 0 ? report.revenue / report.spend : 0;
                    const dayCtr = (report.impressions || 0) > 0 ? ((report.clicks || 0) / (report.impressions || 1)) * 100 : 0;
                    
                    return (
                      <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {format(new Date(report.date), 'dd MMM yyyy', { locale: ptBR })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                          {report.clicks?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                          {dayCtr.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                          {formatCurrency(report.spend)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-emerald-600 font-bold">
                          {formatCurrency(report.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Badge variant={dayRoas >= 1 ? 'default' : 'secondary'} className={dayRoas >= 1 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                            {dayRoas.toFixed(2)}x
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-8">
      <div className="flex justify-between items-center h-16 max-w-5xl mx-auto w-full">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <Skeleton className="h-[300px] w-full rounded-2xl" />
      </div>
    </div>
  );
}