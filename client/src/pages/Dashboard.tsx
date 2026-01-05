import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardStats, InsertSale } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  BarChart3, 
  Upload, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Video,
  Share2,
  Plus,
  AlertCircle,
  FileText
} from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Papa from "papaparse";

export default function Dashboard() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugHeaders, setDebugHeaders] = useState<string[]>([]);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (sales: any[]) => {
      await apiRequest("POST", "/api/sales/bulk", sales);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setLastError(null);
      setDebugHeaders([]);
      toast({
        title: "Sucesso!",
        description: "Planilha processada e vendas importadas.",
      });
    },
    onError: (error: any) => {
      setLastError("Erro ao enviar dados para o servidor. Verifique se o formato da planilha está correto.");
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao importar dados.",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLastError(null);
    setDebugHeaders([]);
    setIsUploading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "ISO-8859-1",
      complete: (results) => {
        setIsUploading(false);
        const headers = results.meta.fields || [];
        setDebugHeaders(headers);
        console.log("CSV Headers found:", headers);
        
        if (results.data.length === 0) {
          setLastError("A planilha parece estar vazia.");
          return;
        }

        const sales: any[] = results.data.map((row: any) => {
          const getVal = (possibleKeys: string[]) => {
            for (const key of possibleKeys) {
              const cleanKey = key.toLowerCase().trim();
              const foundKey = Object.keys(row).find(k => {
                const kClean = k.toLowerCase().trim();
                return kClean === cleanKey || kClean.includes(cleanKey);
              });
              if (foundKey) return row[foundKey];
            }
            return null;
          };

          const orderId = getVal(["ID do Pedido", "Order ID", "Nº do pedido", "Número do pedido", "Referência"]);
          const rawRevenue = getVal(["Receita Total", "Total Revenue", "Preço Original", "Total do pedido", "Valor", "Preço"]);
          const rawSource = getVal(["Origem", "Shopee Video", "Canal de Venda", "Informação da fonte", "Tipo"]);
          const rawDate = getVal(["Data do Pedido", "Order Creation Date", "Data de criação do pedido", "Hora do pedido", "Data"]);

          if (!orderId) return null;

          let revenueCents = 0;
          if (rawRevenue) {
            const cleanRevenue = String(rawRevenue).replace(/[R$\s]/g, "").replace(",", ".");
            revenueCents = Math.floor(parseFloat(cleanRevenue) * 100);
          }

          const source = String(rawSource || "").toLowerCase().includes("video") 
            ? "shopee_video" 
            : "social_media";
          
          return {
            orderId: String(orderId).trim(),
            orderDate: rawDate || new Date().toISOString(),
            revenue: isNaN(revenueCents) ? 0 : revenueCents,
            source: source,
          };
        }).filter(s => s !== null && s.orderId && s.revenue > 0);

        if (sales.length === 0) {
          setLastError("Não conseguimos identificar os dados de vendas. Abaixo estão as colunas que encontramos na sua planilha. Verifique se o arquivo é o 'Relatório de Vendas' da Shopee.");
          return;
        }

        uploadMutation.mutate(sales);
      },
      error: (error) => {
        setIsUploading(false);
        setLastError(`Erro ao ler o arquivo: ${error.message}`);
      }
    });
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#EE4D2D] rounded-lg flex items-center justify-center">
              <BarChart3 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">InstaDash <span className="text-[#EE4D2D] font-normal">Shopee</span></h1>
          </div>
          <div className="flex items-center space-x-4">
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || uploadMutation.isPending}
              className="bg-[#EE4D2D] hover:bg-[#D73211] text-white gap-2"
            >
              <Upload className="w-4 h-4" />
              {isUploading || uploadMutation.isPending ? "Processando..." : "Subir Planilha Shopee"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {lastError && (
          <div className="space-y-4">
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro no Processamento</AlertTitle>
              <AlertDescription>{lastError}</AlertDescription>
            </Alert>
            
            {debugHeaders.length > 0 && (
              <Card className="border-dashed border-2">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Colunas detectadas na sua planilha:
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="flex flex-wrap gap-2">
                    {debugHeaders.map((h, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{h}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                GANHEI (TOTAL)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(stats?.totalRevenue || 0)}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                GASTEI (CUSTOS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(stats?.totalExpenses || 0)}</div>
            </CardContent>
          </Card>

          <Card className={`border-none shadow-sm overflow-hidden ${stats && stats.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${stats && stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <DollarSign className="w-4 h-4" />
                LUCRO LÍQUIDO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stats && stats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatCurrency(stats?.netProfit || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Divisão de Vendas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">Shopee Vídeo</CardTitle>
              <Video className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-[#EE4D2D] mb-1">
                {formatCurrency(stats?.videoRevenue || 0)}
              </div>
              <p className="text-sm text-gray-500">Vendas identificadas via Shopee Vídeo</p>
              <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500" 
                  style={{ width: `${stats && stats.totalRevenue > 0 ? (stats.videoRevenue / stats.totalRevenue) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">Redes Sociais</CardTitle>
              <Share2 className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-blue-600 mb-1">
                {formatCurrency(stats?.socialRevenue || 0)}
              </div>
              <p className="text-sm text-gray-500">Vendas via links externos e posts</p>
              <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600" 
                  style={{ width: `${stats && stats.totalRevenue > 0 ? (stats.socialRevenue / stats.totalRevenue) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-gray-900">Análise de Desempenho</h3>
            <p className="text-sm text-gray-500">Compare qual canal está trazendo mais lucro hoje.</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Custo Manual
          </Button>
        </div>
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 space-y-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1,2].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}
