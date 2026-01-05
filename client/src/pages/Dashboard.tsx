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
  FileText,
  Search,
  Trophy,
  ShoppingCart,
  MousePointer2,
  Sparkles,
  Package
} from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Papa from "papaparse";

export default function Dashboard() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugHeaders, setDebugHeaders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [localProducts, setLocalProducts] = useState<any[]>([]);

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
        description: "Planilha processada e vendas importadas. Dados antigos foram substituídos.",
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

          const subId = getVal(["Sub ID", "Sub-ID", "Sub_ID"]);
          const orderId = getVal(["ID do Pedido", "Order ID", "Nº do pedido", "Número do pedido", "Referência", "Order No."]);
          const rawRevenue = getVal(["Receita Total", "Total Revenue", "Preço Original", "Total do pedido", "Valor", "Preço", "Order Amount", "Total"]);
          const rawDate = getVal(["Data do Pedido", "Order Creation Date", "Data de criação do pedido", "Hora do pedido", "Data", "Order Time"]);
          const productName = getVal(["Nome do Produto", "Product Name", "Nome", "Descrição do produto", "Product"]);
          const rawClicks = getVal(["Cliques", "Clicks", "Número de cliques", "Visualizações de página"]);
          const rawStatus = getVal(["Status do pedido", "Order Status", "Status", "Situação"]);

          if (!orderId) return null;

          let revenueCents = 0;
          if (rawRevenue) {
            const cleanRevenue = String(rawRevenue).replace(/[R$\s]/g, "").replace(",", ".");
            revenueCents = Math.floor(parseFloat(cleanRevenue) * 100);
          }

          // Lógica: Se tiver Sub ID -> Redes Sociais. Caso contrário -> Shopee Video.
          const source = subId ? "social_media" : "shopee_video";
          
          return {
            orderId: String(orderId).trim(),
            orderDate: rawDate || new Date().toISOString(),
            revenue: isNaN(revenueCents) ? 0 : revenueCents,
            source: source,
            productName: productName ? String(productName).trim() : "Produto Indefinido",
            clicks: parseInt(String(rawClicks || "0"), 10) || 0
          };
        }).filter(s => s !== null && s.orderId && s.revenue > 0);

        if (sales.length === 0) {
          setLastError("Não conseguimos identificar os dados de vendas automaticamente. Verifique se o arquivo é o exportado da Shopee.");
          return;
        }

        uploadMutation.mutate(sales);
        setLocalProducts(sales);
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

  const filteredProducts = useMemo(() => {
    if (!localProducts.length) return [];
    return localProducts.filter(p => 
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.orderId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [localProducts, searchTerm]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#EE4D2D] rounded-lg flex items-center justify-center shadow-md">
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
              className="bg-[#EE4D2D] hover:bg-[#D73211] text-white gap-2 font-bold shadow-sm"
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
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-bold">Atenção!</AlertTitle>
              <AlertDescription className="text-sm">
                {lastError}
              </AlertDescription>
            </Alert>
            
            {debugHeaders.length > 0 && (
              <Card className="border-dashed border-2 bg-gray-50/50 rounded-2xl">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    Colunas detectadas no seu arquivo:
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex flex-wrap gap-2">
                    {debugHeaders.map((h, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-mono text-gray-500 shadow-sm">{h}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl hover-elevate transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Faturamento Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-gray-900">{formatCurrency(stats?.totalRevenue || 0)}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl hover-elevate transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Custos (Saídas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-gray-900">{formatCurrency(stats?.totalExpenses || 0)}</div>
            </CardContent>
          </Card>

          <Card className={`border-none shadow-sm overflow-hidden rounded-2xl hover-elevate transition-all ${stats && stats.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-xs font-bold flex items-center gap-2 uppercase tracking-widest ${stats && stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <DollarSign className="w-4 h-4" />
                Lucro Líquido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-black ${stats && stats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatCurrency(stats?.netProfit || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Métricas de Engajamento */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl hover-elevate transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                <ShoppingCart className="w-4 h-4 text-blue-500" />
                Total Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-gray-900">{stats?.totalOrders || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl hover-elevate transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                <MousePointer2 className="w-4 h-4 text-purple-500" />
                Total Cliques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-gray-900">{stats?.totalClicks || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl hover-elevate transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                <Share2 className="w-4 h-4 text-blue-600" />
                Cliques Redes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-gray-900">{stats?.socialClicks || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl hover-elevate transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                <Video className="w-4 h-4 text-orange-500" />
                Cliques Vídeo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-gray-900">{(stats?.totalClicks || 0) - (stats?.socialClicks || 0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Produto Mais Vendido - Novo Design */}
        {stats?.topProduct && (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#EE4D2D] to-orange-400 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <Card className="relative border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem]">
              <div className="flex flex-col md:flex-row min-h-[280px]">
                {/* Lado Esquerdo - Info */}
                <div className="flex-1 p-8 md:p-12 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-100 rounded-2xl">
                      <Trophy className="w-6 h-6 text-[#EE4D2D]" />
                    </div>
                    <span className="text-[#EE4D2D] font-black uppercase tracking-[0.2em] text-xs">Produto Revelação</span>
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight tracking-tighter">
                      {stats.topProduct.name}
                    </h2>
                    <p className="text-lg text-gray-500 font-medium max-w-lg">
                      Líder absoluto em conversões. Este produto dominou os resultados da sua última análise.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-gray-300" />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-gray-400">+ clientes interessados</p>
                  </div>
                </div>

                {/* Lado Direito - Stats */}
                <div className="w-full md:w-[320px] bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-8 md:p-12 flex flex-col justify-center items-center text-center space-y-8">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 text-orange-400 mb-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Performance</span>
                    </div>
                    <p className="text-6xl md:text-7xl font-black text-white tracking-tighter">
                      {stats.topProduct.orders}
                    </p>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Vendas Confirmadas</p>
                  </div>

                  <div className="w-full h-px bg-white/10" />

                  <div className="grid grid-cols-2 w-full gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Impacto</p>
                      <p className="text-2xl font-black text-white">
                        {((stats.topProduct.orders / stats.totalOrders) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Rank</p>
                      <p className="text-2xl font-black text-orange-400">#1</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Divisão de Vendas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-8 px-8">
              <CardTitle className="text-xl font-black text-gray-800">Shopee Vídeo</CardTitle>
              <div className="p-3 bg-orange-100 rounded-2xl group-hover:bg-[#EE4D2D] transition-colors">
                <Video className="h-6 w-6 text-[#EE4D2D] group-hover:text-white transition-colors" />
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="text-5xl font-black text-[#EE4D2D] mb-2 tracking-tighter">
                {formatCurrency(stats?.videoRevenue || 0)}
              </div>
              <p className="text-sm font-medium text-gray-400">Vendas (Padrão)</p>
              <div className="mt-8 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#EE4D2D] rounded-full transition-all duration-1000" 
                  style={{ width: `${stats && stats.totalRevenue > 0 ? (stats.videoRevenue / stats.totalRevenue) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-8 px-8">
              <CardTitle className="text-xl font-black text-gray-800">Redes Sociais</CardTitle>
              <div className="p-3 bg-blue-100 rounded-2xl group-hover:bg-blue-600 transition-colors">
                <Share2 className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors" />
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="text-5xl font-black text-blue-600 mb-2 tracking-tighter">
                {formatCurrency(stats?.socialRevenue || 0)}
              </div>
              <p className="text-sm font-medium text-gray-400">Vendas com Sub ID ou Pendentes</p>
              <div className="mt-8 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                  style={{ width: `${stats && stats.totalRevenue > 0 ? (stats.socialRevenue / stats.totalRevenue) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-lg font-black text-gray-900">Análise Dinâmica</h3>
            <p className="text-sm font-medium text-gray-500">Dados baseados no seu último upload.</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <Input 
                 placeholder="Buscar..." 
                 className="pl-10 rounded-xl border-gray-200 h-11"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             <Button variant="outline" className="h-11 rounded-xl font-bold px-6 border-gray-200">
               <Plus className="w-4 h-4 mr-2" />
               Custo
             </Button>
          </div>
        </div>

        {filteredProducts.length > 0 && (
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-3xl">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-xl font-black text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#EE4D2D]" />
                Produtos Carregados
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold text-gray-900">ID do Pedido</TableHead>
                      <TableHead className="font-bold text-gray-900">Produto</TableHead>
                      <TableHead className="font-bold text-gray-900 text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product, index) => (
                      <TableRow key={`${product.orderId}-${index}`} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-mono text-sm text-gray-500">{product.orderId}</TableCell>
                        <TableCell className="font-medium text-gray-900">{product.productName}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          {formatCurrency(product.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
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
