import { useAds } from "@/hooks/use-ads";
import { CreateAdDialog } from "@/components/CreateAdDialog";
import { Button } from "@/components/ui/button";
import { 
  BarChart3,
  Search,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";
import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdResponse } from "@shared/schema";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

export default function Dashboard() {
  const { data: ads, isLoading } = useAds() as { data: AdResponse[] | undefined, isLoading: boolean };
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [fbStatus, setFbStatus] = useState<'idle' | 'loading' | 'connected'>('idle');

  useEffect(() => {
    // Carregar SDK do Facebook
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as HTMLScriptElement; js.id = id;
      js.src = "https://connect.facebook.net/pt_BR/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));

    window.fbAsyncInit = function() {
      window.FB.init({
        appId      : import.meta.env.VITE_FACEBOOK_APP_ID,
        cookie     : true,
        xfbml      : true,
        version    : 'v18.0'
      });
      
      window.FB.getLoginStatus(function(response: any) {
        if (response.status === 'connected') {
          setFbStatus('connected');
        }
      });
    };
  }, []);

  const handleFBLogin = () => {
    setFbStatus('loading');
    window.FB.login(function(response: any) {
      if (response.authResponse) {
        console.log('Token de acesso:', response.authResponse.accessToken);
        setFbStatus('connected');
        setShowOnboarding(false);
        window.alert('Conectado com sucesso! Agora você pode importar dados reais.');
      } else {
        setFbStatus('idle');
        window.alert('Login cancelado ou não autorizado.');
      }
    }, {scope: 'public_profile,email,ads_read,instagram_basic'});
  };

  const stats = useMemo(() => {
    if (!ads || ads.length === 0) return { spend: 0, revenue: 0, profit: 0, roi: 0 };
    
    let totalSpend = 0;
    let totalRevenue = 0;

    ads.forEach((ad: AdResponse) => {
      if (ad.reports) {
        ad.reports.forEach((report) => {
          totalSpend += report.spend;
          totalRevenue += report.revenue;
        });
      }
    });

    const profit = totalRevenue - totalSpend;
    const roi = totalSpend > 0 ? (profit / totalSpend) * 100 : 0;
    
    return {
      spend: totalSpend,
      revenue: totalRevenue,
      profit: profit,
      roi: roi
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

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const isProfit = stats.profit >= 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">InstaDash</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-500">Configurações</Button>
            <div className="h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
              JD
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        
        {showOnboarding && (
          <div className="bg-blue-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Conecte seus anúncios reais</h2>
                <p className="text-blue-100 max-w-md">
                  Pare de usar dados simulados. Conecte sua conta do Facebook para importar automaticamente seus anúncios impulsionados do Instagram.
                </p>
                <p className="text-[10px] text-blue-200 mt-2">
                  * Este app não é oficial da Meta. Utilizamos a API oficial para vincular seus dados com segurança. 
                  Ao conectar, você concorda com nossa <Link href="/privacy" className="underline hover:text-white">Política de Privacidade</Link>.
                </p>
              </div>
              <Button 
                onClick={handleFBLogin}
                disabled={fbStatus === 'loading' || fbStatus === 'connected'}
                className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 h-12 rounded-xl shrink-0 flex items-center gap-2"
              >
                {fbStatus === 'connected' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Instagram Conectado
                  </>
                ) : fbStatus === 'loading' ? (
                  "Conectando..."
                ) : (
                  "Conectar Instagram"
                )}
              </Button>
            </div>
            <button 
              onClick={() => setShowOnboarding(false)}
              className="absolute top-4 right-4 text-blue-200 hover:text-white"
            >
              <Search className="w-5 h-5 rotate-45" />
            </button>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
            {['Hoje', '7 dias', '30 dias', 'Este mês'].map((label) => (
              <button 
                key={label}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${label === '30 dias' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <CreateAdDialog />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Quanto Gastei</p>
            <h2 className="text-4xl font-bold tracking-tight text-gray-900">{formatCurrency(stats.spend)}</h2>
          </div>
          
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Quanto Ganhei</p>
            <h2 className="text-4xl font-bold tracking-tight text-gray-900">{formatCurrency(stats.revenue)}</h2>
          </div>

          <div className={`p-8 rounded-2xl border transition-all shadow-sm ${
            isProfit 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
              : 'bg-red-50 border-red-100 text-red-900'
          }`}>
            <p className="text-sm font-medium uppercase tracking-wider mb-2 opacity-80">Lucro</p>
            <h2 className="text-4xl font-bold tracking-tight">{formatCurrency(stats.profit)}</h2>
            <div className="mt-2">
              <Badge className={isProfit ? 'bg-emerald-200 text-emerald-800 border-emerald-300' : 'bg-red-200 text-red-800 border-red-300'}>
                {isProfit ? '+' : ''}{stats.roi.toFixed(1)}% ROI
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-2 ${isProfit ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            {isProfit ? 'Status: Lucro' : 'Status: Prejuízo'}
          </div>
          <span>•</span>
          <span>Última atualização: há 2 horas</span>
          <span>•</span>
          <span>Campanhas ativas: {ads?.filter(a => a.status === 'active').length || 0}</span>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Desempenho por Campanha</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Buscar campanhas..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl border-gray-200 bg-white"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Nome da Campanha</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Gasto</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Receita</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Lucro</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAds?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      Nenhuma campanha encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredAds?.map((ad) => {
                    const adSpend = ad.reports?.reduce((acc, r) => acc + r.spend, 0) || 0;
                    const adRevenue = ad.reports?.reduce((acc, r) => acc + r.revenue, 0) || 0;
                    const adProfit = adRevenue - adSpend;
                    
                    return (
                      <tr key={ad.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{ad.name}</p>
                          <p className="text-xs text-gray-500">ID: {ad.platformIdentifier}</p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={ad.status === 'active' ? 'default' : 'secondary'} className={ad.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                            {ad.status === 'active' ? 'Ativa' : 'Pausada'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(adSpend)}</td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-600">{formatCurrency(adRevenue)}</td>
                        <td className={`px-6 py-4 text-right font-bold ${adProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(adProfit)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/ads/${ad.id}`}>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              Ver detalhes
                            </Button>
                          </Link>
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

      <footer className="max-w-5xl mx-auto px-6 py-8 border-t border-gray-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
              <BarChart3 className="text-gray-400 w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-gray-500">InstaDash</span>
          </div>
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Termos de Serviço</Link>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Política de Privacidade</Link>
          </div>
          <p className="text-xs text-gray-400">
            © 2026 InstaDash. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-8">
      <div className="flex justify-between items-center h-20 max-w-5xl mx-auto w-full">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    </div>
  );
}