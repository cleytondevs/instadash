import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardStats, InsertSale } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
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
  Sparkles,
  Settings,
  Facebook,
  Package,
  PieChart
} from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [fbConfig, setFbConfig] = useState({ appId: "", appSecret: "" });
  const [isConnectingFb, setIsConnectingFb] = useState(false);

  const [timeFilter, setTimeFilter] = useState<"today" | "yesterday" | "weekly" | "monthly">("weekly");
  const [uploads, setUploads] = useState<{ id: string, date: string, count: number }[]>([]);

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["dashboard-stats", timeFilter],
    queryFn: async () => {
      try {
        let query = supabase.from("sales").select("*");
        
        const now = new Date();
        if (timeFilter === "today") {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          query = query.gte("order_date", today);
        } else if (timeFilter === "yesterday") {
          const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          query = query.eq("order_date", yesterdayStr);
        } else if (timeFilter === "weekly") {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          query = query.gte("order_date", oneWeekAgo.toISOString());
        } else if (timeFilter === "monthly") {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          query = query.gte("order_date", oneMonthAgo.toISOString());
        }

        const { data: salesData, error: salesError } = await query;
        const { data: expensesData, error: expensesError } = await supabase.from("expenses").select("*");

        if (salesError || expensesError) {
          console.error("Erro na busca de dados (Supabase):", salesError || expensesError);
          // Fallback para evitar travamento da UI se for erro de cache
          return {
            totalRevenue: 0,
            videoRevenue: 0,
            socialRevenue: 0,
            totalExpenses: 0,
            netProfit: 0,
            totalOrders: 0,
            totalClicks: 0,
            socialClicks: 0,
            topProduct: null
          };
        }

        console.log("Dados recebidos:", { sales: salesData?.length, expenses: expensesData?.length });

        const videoRevenue = (salesData || [])
          .filter((s: any) => s.source === 'shopee_video')
          .reduce((sum: number, s: any) => sum + (Number(s.revenue) || 0), 0);

        const socialRevenue = (salesData || [])
          .filter((s: any) => s.source === 'social_media')
          .reduce((sum: number, s: any) => sum + (Number(s.revenue) || 0), 0);

        const totalRevenue = videoRevenue + socialRevenue;
        const totalExpenses = (expensesData || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0) + fbAdSpend;
        
        const productCounts: Record<string, number> = {};
        (salesData || []).forEach((sale: any) => {
          if (sale.product_name) {
            productCounts[sale.product_name] = (productCounts[sale.product_name] || 0) + 1;
          }
        });

        let topProduct = null;
        let maxOrders = 0;
        for (const [name, count] of Object.entries(productCounts)) {
          if (count > maxOrders) {
            maxOrders = count;
            topProduct = { name, orders: count };
          }
        }

        const categoryData = Object.entries(productCounts)
          .map(([name, value]) => {
            // Lógica simples de categorização baseada em palavras-chave
            let category = "Outros";
            const lowerName = name.toLowerCase();
            if (lowerName.includes("creme") || lowerName.includes("shampoo") || lowerName.includes("maquiagem") || lowerName.includes("pele")) category = "Cosméticos";
            else if (lowerName.includes("fone") || lowerName.includes("celular") || lowerName.includes("usb") || lowerName.includes("eletrônico")) category = "Eletrônicos";
            else if (lowerName.includes("camisa") || lowerName.includes("calça") || lowerName.includes("vestido")) category = "Vestuário";
            else if (lowerName.includes("casa") || lowerName.includes("cozinha") || lowerName.includes("decoração")) category = "Casa";
            
            return { name, value, category };
          });

        const categorySummary = categoryData.reduce((acc: Record<string, number>, item) => {
          acc[item.category] = (acc[item.category] || 0) + item.value;
          return acc;
        }, {});

        const chartData = Object.entries(categorySummary).map(([name, value]) => ({ name, value }));

        const stats = {
          totalRevenue,
          videoRevenue,
          socialRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          totalOrders: (salesData || []).length,
          totalClicks: (salesData || []).reduce((sum: number, s: any) => sum + (Number(s.clicks) || 0), 0),
          socialClicks: (salesData || [])
            .filter((s: any) => s.source === 'social_media')
            .reduce((sum: number, s: any) => sum + (Number(s.clicks) || 0), 0),
          topProduct,
          chartData
        };
        
        return stats;
      } catch (err) {
        console.error("Erro crítico na Dashboard:", err);
        throw err;
      }
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (sales: any[]) => {
      try {
        const batchId = `upload_${Date.now()}`;
        const { error: insertError } = await supabase
          .from("sales")
          .upsert(
            sales.map(s => ({
              user_id: "default-user",
              order_id: s.orderId,
              product_name: s.productName,
              revenue: s.revenue,
              clicks: s.clicks,
              source: s.source,
              order_date: s.orderDate,
              batch_id: batchId
            })),
            { onConflict: 'order_id' }
          );

        if (insertError) {
          console.error("Erro no upsert:", insertError);
          throw insertError;
        }
      } catch (err: any) {
        throw new Error(`Erro: ${err.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setLastError(null);
      setDebugHeaders([]);
      toast({
        title: "Sucesso!",
        description: "Planilha processada e vendas importadas. Dados antigos foram substituídos.",
      });
      setIsUploading(false);
    },
    onError: (error: any) => {
      setLastError(`Erro ao enviar dados: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Erro no Upload",
        description: error.message,
      });
      setIsUploading(false);
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
          const rawClicks = getVal(["Cliques gerados pelos links promocionais do afiliado", "Cliques no produto", "Cliques", "Clicks", "Número de cliques", "Visualizações de página", "Product Clicks", "Item Clicks"]);
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
            subId: subId ? String(subId).trim() : "-",
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

  const handleSaveFbConfig = () => {
    toast({
      title: "Configuração Salva",
      description: "As chaves do Facebook Ads foram salvas para integração futura.",
    });
  };

  const handleConnectFb = () => {
    if (!fbConfig.appId) {
      toast({
        variant: "destructive",
        title: "App ID ausente",
        description: "Por favor, insira o App ID do seu aplicativo Meta.",
      });
      return;
    }

    // Inicializa o SDK do Facebook dinamicamente se ainda não estiver carregado
    if (!(window as any).FB) {
      const script = document.createElement('script');
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        (window as any).FB.init({
          appId: fbConfig.appId,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        loginWithFb();
      };
      document.body.appendChild(script);
    } else {
      loginWithFb();
    }
  };

  const loginWithFb = () => {
    setIsConnectingFb(true);
    (window as any).FB.login((response: any) => {
      setIsConnectingFb(false);
      if (response.authResponse) {
        toast({
          title: "Conectado com Sucesso",
          description: "Seu perfil do Facebook foi vinculado. Agora você pode buscar relatórios.",
        });
        fetchAdSpend();
      } else {
        toast({
          variant: "destructive",
          title: "Falha na conexão",
          description: "O login com o Facebook foi cancelado ou falhou.",
        });
      }
    }, { scope: 'public_profile,email' });
  };

  const [fbAdSpend, setFbAdSpend] = useState<number>(0);
  const [isFetchingAds, setIsFetchingAds] = useState(false);
  const [shopeeLink, setShopeeLink] = useState("");
  const [subId, setSubId] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  const { data: trackedLinks, refetch: refetchLinks } = useQuery<any[]>({
    queryKey: ["/api/links"],
  });

  const createLinkMutation = useMutation({
    mutationFn: async (newLink: any) => {
      const res = await apiRequest("POST", "/api/links", newLink);
      return res.json();
    },
    onSuccess: () => {
      refetchLinks();
      toast({ title: "Sucesso", description: "Link salvo em 'Meus Links'" });
    }
  });

  const handleGenerateLink = () => {
    if (!shopeeLink) {
      toast({ variant: "destructive", title: "Erro", description: "Insira um link da Shopee" });
      return;
    }
    
    try {
      const url = new URL(shopeeLink);
      if (subId) url.searchParams.set("sub_id", subId);
      url.searchParams.set("utm_source", "instadash");
      
      const finalLink = url.toString();
      setGeneratedLink(finalLink);
      
      // Salvar no banco
      createLinkMutation.mutate({
        originalUrl: finalLink,
        trackedUrl: "", // Será gerado pelo backend se necessário, mas aqui usamos o ID
        subId: subId
      });
      
    } catch (e) {
      toast({ variant: "destructive", title: "Link Inválido", description: "Certifique-se de que o link da Shopee está correto." });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Link copiado para a área de transferência." });
  };

  const fetchAdSpend = () => {
    if (!(window as any).FB) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "SDK do Facebook não carregado. Tente conectar novamente.",
      });
      return;
    }

    setIsFetchingAds(true);
    
    // Obter data de ontem para o relatório
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    (window as any).FB.api(
      '/me/adaccounts',
      'GET',
      { fields: 'id,name,account_id' },
      (response: any) => {
        if (response && !response.error) {
          // Para cada conta, buscar os insights de ontem
          const accountPromises = response.data.map((acc: any) => {
            return new Promise((resolve) => {
              (window as any).FB.api(
                `/${acc.id}/insights`,
                'GET',
                { 
                  time_range: JSON.stringify({ since: dateStr, until: dateStr }),
                  fields: 'spend'
                },
                (insights: any) => {
                  if (insights && !insights.error && insights.data.length > 0) {
                    resolve(parseFloat(insights.data[0].spend) || 0);
                  } else {
                    resolve(0);
                  }
                }
              );
            });
          });

          Promise.all(accountPromises).then((results: any) => {
            const totalSpent = results.reduce((sum: number, val: number) => sum + val, 0);
            setFbAdSpend(Math.floor(totalSpent * 100)); // Convert to cents
            toast({
              title: "Relatório Atualizado",
              description: `Gastos de ontem carregados: ${formatCurrency(Math.floor(totalSpent * 100))}`,
            });
            setIsFetchingAds(false);
          });
        } else {
          console.error("Erro ao buscar contas:", response.error);
          toast({
            variant: "destructive",
            title: "Erro na API",
            description: response.error?.message || "Não foi possível buscar as contas.",
          });
          setIsFetchingAds(false);
        }
      }
    );
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

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from("sales")
        .delete()
        .eq("batch_id", batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["upload-batches"] });
      toast({
        title: "Sucesso",
        description: "Upload removido com sucesso.",
      });
    },
  });

  const { data: uploadBatches } = useQuery({
    queryKey: ["upload-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("batch_id, upload_date")
        .order("upload_date", { ascending: false });
      
      if (error) throw error;
      
      const uniqueBatches = new Map();
      data?.forEach((item: any) => {
        if (item.batch_id && !uniqueBatches.has(item.batch_id)) {
          uniqueBatches.set(item.batch_id, {
            id: item.batch_id,
            date: item.upload_date,
            count: data.filter((s: any) => s.batch_id === item.batch_id).length
          });
        }
      });
      return Array.from(uniqueBatches.values());
    }
  });

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
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2 font-bold shadow-sm">
                  <Share2 className="w-4 h-4" />
                  Meus Links
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-emerald-600" />
                    Meus Links
                  </DialogTitle>
                  <DialogDescription>
                    Gerencie seus links rastreados e crie novos para monitorar suas vendas.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-bold">Link Original Shopee</label>
                    <Input 
                      placeholder="Cole o link do produto aqui..." 
                      value={shopeeLink}
                      onChange={(e) => setShopeeLink(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-bold">Sub ID (Identificador)</label>
                    <Input 
                      placeholder="Ex: influencer_joao ou story_hoje" 
                      value={subId}
                      onChange={(e) => setSubId(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleGenerateLink} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                    Gerar Link Rastreado
                  </Button>
                  
                  {generatedLink && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Link Gerado:</p>
                      <div className="flex gap-2">
                        <Input readOnly value={generatedLink} className="bg-white" />
                        <Button size="icon" variant="outline" onClick={() => copyToClipboard(generatedLink)}>
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 space-y-4">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Meus Links Gerados
                    </h3>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {(trackedLinks || []).map((link: any) => (
                        <div key={link.id} className="p-3 bg-white border border-gray-100 rounded-xl flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate text-gray-900">{link.subId || "Sem ID"}</p>
                            <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{link.originalUrl}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-xs font-bold text-blue-600">{link.clicks} cliques</p>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(`https://instadashshopee.netlify.app/l/${link.id}`)}>
                              <Share2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
        <div className="flex items-center justify-between gap-4">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <Button 
              variant={timeFilter === "today" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setTimeFilter("today")}
              className="rounded-lg whitespace-nowrap"
            >
              Hoje
            </Button>
            <Button 
              variant={timeFilter === "yesterday" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setTimeFilter("yesterday")}
              className="rounded-lg whitespace-nowrap"
            >
              Ontem
            </Button>
            <Button 
              variant={timeFilter === "weekly" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setTimeFilter("weekly")}
              className="rounded-lg whitespace-nowrap"
            >
              Semanal
            </Button>
            <Button 
              variant={timeFilter === "monthly" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setTimeFilter("monthly")}
              className="rounded-lg whitespace-nowrap"
            >
              Mensal
            </Button>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                <FileText className="w-4 h-4" />
                Gerenciar Uploads
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Histórico de Uploads</DialogTitle>
                <DialogDescription>
                  Visualize e gerencie os arquivos que você subiu.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[300px] overflow-y-auto space-y-2 py-4">
                {uploadBatches?.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {new Date(batch.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-500">{batch.count} vendas importadas</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => deleteBatchMutation.mutate(batch.id)}
                      disabled={deleteBatchMutation.isPending}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {(!uploadBatches || uploadBatches.length === 0) && (
                  <p className="text-center text-gray-500 py-8 text-sm">Nenhum upload realizado ainda.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <Share2 className="w-4 h-4 text-blue-600" />
                Cliques Redes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-gray-900">{stats?.socialClicks || 0}</div>
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

        {(stats as any)?.chartData?.length > 0 && (
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-3xl">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-xl font-black text-gray-800 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#EE4D2D]" />
                Vendas por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={(stats?.chartData) || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {((stats?.chartData) || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={["#EE4D2D", "#FFB100", "#22C55E", "#3B82F6", "#A855F7"][index % 5]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-700">Resumo de Categorias</h3>
                  {((stats?.chartData) || []).map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-600">{item.name}</span>
                      <span className="font-bold text-gray-900">{item.value} vendas</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-gray-200 text-center space-y-4">
        <div className="flex items-center justify-center space-x-6 text-sm font-medium text-gray-500">
          <Link href="/terms" className="hover:text-[#EE4D2D] transition-colors">Termos de Serviço</Link>
          <Link href="/privacy" className="hover:text-[#EE4D2D] transition-colors">Política de Privacidade</Link>
          <Link href="/data-deletion" className="hover:text-[#EE4D2D] transition-colors">Exclusão de Dados</Link>
        </div>
        <p className="text-xs text-gray-400">© 2026 InstaDash. Todos os direitos reservados.</p>
      </footer>
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
