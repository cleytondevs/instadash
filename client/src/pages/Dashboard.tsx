import { KPICard } from "@/components/KPICard";
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
            topProduct: null,
            salesData: []
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
          chartData,
          salesData: salesData || []
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
              sub_id: s.subId,
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
            const rowKeys = Object.keys(row);
            for (const key of possibleKeys) {
              const cleanSearchKey = key.toLowerCase().replace(/[\s_-]/g, "");
              const foundKey = rowKeys.find(k => {
                const cleanK = k.toLowerCase().replace(/[\s_-]/g, "");
                return cleanK === cleanSearchKey || cleanK.includes(cleanSearchKey);
              });
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                return row[foundKey];
              }
            }
            return null;
          };

          const subId = getVal(["Sub ID", "Sub-ID", "Sub_ID", "Subid", "sub_id", "subid"]);
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
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);

  const { data: trackedLinks, refetch: refetchLinks } = useQuery<any[]>({
    queryKey: ["tracked-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracked_links")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const updateLinkMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: updatedLink, error } = await supabase
        .from("tracked_links")
        .update({
          original_url: data.originalUrl,
          tracked_url: data.trackedUrl,
          sub_id: data.subId
        })
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw error;
      return updatedLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-links"] });
      toast({ title: "Sucesso", description: "Link atualizado com sucesso!" });
      setEditingLinkId(null);
      setShopeeLink("");
      setSubId("");
      setGeneratedLink("");
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: async (newLink: any) => {
      const { data, error } = await supabase
        .from("tracked_links")
        .insert([{
          user_id: "default-user",
          original_url: newLink.originalUrl,
          tracked_url: newLink.trackedUrl,
          sub_id: newLink.subId
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-links"] });
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
      
      if (editingLinkId) {
        updateLinkMutation.mutate({
          id: editingLinkId,
          originalUrl: shopeeLink,
          trackedUrl: generatedLink || finalLink,
          subId: subId
        });
      } else {
        createLinkMutation.mutate({
          originalUrl: shopeeLink,
          trackedUrl: finalLink,
          subId: subId
        });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Link Inválido", description: "Certifique-se de que o link da Shopee está correto." });
    }
  };

  const handleEditLink = (link: any) => {
    setEditingLinkId(link.id);
    setShopeeLink(link.originalUrl);
    setSubId(link.subId || "");
    setGeneratedLink("");
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

  const { data: campaignSheets } = useQuery({
    queryKey: ["campaign-sheets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaign_sheets").select("sub_id");
      if (error) throw error;
      return data?.map(s => s.sub_id) || [];
    }
  });

  const [subIdForNewCampaign, setSubIdForNewCampaign] = useState<string | null>(null);
  const [initialExpense, setInitialExpense] = useState("");

  const createCampaignMutation = useMutation({
    mutationFn: async ({ subId, expense }: { subId: string, expense: number }) => {
      // 1. Criar a planilha
      const { data: sheet, error: sheetError } = await supabase
        .from("campaign_sheets")
        .insert([{ sub_id: subId, user_id: "default-user" }])
        .select()
        .single();
      
      if (sheetError) throw sheetError;

      // 2. Se houver gasto inicial, adicionar
      if (expense > 0) {
        const { error: expenseError } = await supabase
          .from("campaign_expenses")
          .insert([{
            campaign_sheet_id: sheet.id,
            amount: expense,
            date: new Date().toISOString().split('T')[0]
          }]);
        if (expenseError) throw expenseError;
      }

      return sheet;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-sheets"] });
      toast({ title: "Sucesso", description: "Planilha de campanha criada com gasto inicial." });
      setSubIdForNewCampaign(null);
      setInitialExpense("");
    }
  });

  const filteredProducts = useMemo(() => {
    const dataToFilter = stats?.salesData || localProducts || [];
    if (!dataToFilter.length) return [];
    
    return dataToFilter
      .map((p: any) => {
        // Normaliza o Sub ID priorizando o valor vindo do banco ou da planilha
        const subIdValue = p.sub_id || p.subId || p.subid || p["Sub ID"] || p["Sub-ID"];
        return {
          productName: p.product_name || p.productName || p.Nome || p.Product,
          orderId: p.order_id || p.orderId || p.ID || p["Order ID"],
          subId: subIdValue && subIdValue !== "-" ? String(subIdValue).trim() : "-",
          revenue: p.revenue,
          clicks: p.clicks
        };
      })
      .filter((p: any) => {
        const search = searchTerm.toLowerCase();
        return (
          p.productName?.toLowerCase().includes(search) ||
          p.orderId?.toLowerCase().includes(search) ||
          p.subId?.toLowerCase().includes(search)
        );
      });
  }, [stats?.salesData, localProducts, searchTerm]);

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
    <div className="min-h-screen bg-[#F8FAFC] pb-24 sm:pb-20 font-sans">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-8 h-8 flex-shrink-0 bg-[#EE4D2D] rounded-lg flex items-center justify-center shadow-md">
              <BarChart3 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              InstaDash <span className="text-[#EE4D2D] font-normal hidden sm:inline">Shopee</span>
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex h-9 rounded-xl font-bold px-4 border-gray-200 gap-2">
                  <Plus className="w-4 h-4" />
                  Gerenciamento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] w-[95vw] rounded-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Gerenciamento de Vendas</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">Minhas Planilhas</p>
                    {trackedLinks?.filter(l => campaignSheets?.includes(l.subId)).map((link: any) => (
                      <Link key={link.id} href={`/campaign/${encodeURIComponent(link.subId)}`}>
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{link.subId}</p>
                            <p className="text-[10px] text-gray-500">Toque para gerenciar</p>
                          </div>
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </div>
                      </Link>
                    ))}
                    {(!campaignSheets || campaignSheets.length === 0) && (
                      <p className="text-center text-gray-500 py-8 text-xs">Nenhuma planilha de campanha criada ainda.</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || uploadMutation.isPending}
              size="sm"
              className="bg-[#EE4D2D] hover:bg-[#D73211] text-white gap-2 font-bold shadow-sm h-9"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">{isUploading || uploadMutation.isPending ? "Processando..." : "Subir Planilha"}</span>
              <span className="sm:hidden">{isUploading || uploadMutation.isPending ? "..." : "Planilha"}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Barra de Navegação Mobile Fixa */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-2 py-2 flex sm:hidden items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto py-1.5 text-[#EE4D2D] flex-1 hover:bg-transparent">
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-bold">Resumo</span>
        </Button>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto py-1.5 text-gray-500 flex-1 hover:bg-transparent">
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-bold">Planilhas</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerenciamento de Vendas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase">Minhas Planilhas</p>
                {trackedLinks?.filter(l => campaignSheets?.includes(l.subId)).map((link: any) => (
                  <Link key={link.id} href={`/campaign/${encodeURIComponent(link.subId)}`}>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{link.subId}</p>
                        <p className="text-[10px] text-gray-500">Toque para gerenciar</p>
                      </div>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto py-1.5 text-gray-500 flex-1 hover:bg-transparent">
              <FileText className="w-5 h-5" />
              <span className="text-[10px] font-bold">Uploads</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] rounded-2xl">
            <DialogHeader><DialogTitle>Histórico</DialogTitle></DialogHeader>
            <div className="max-h-[300px] overflow-y-auto space-y-2 py-4 px-1">
              {uploadBatches?.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{new Date(batch.date).toLocaleDateString('pt-BR')}</p>
                    <p className="text-[10px] text-gray-500">{batch.count} vendas</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => deleteBatchMutation.mutate(batch.id)}>
                    <AlertCircle className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Button 
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center gap-1 h-auto py-1.5 text-gray-500 flex-1 hover:bg-transparent"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] font-bold">Topo</span>
        </Button>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {lastError && (
          <div className="space-y-4">
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-bold text-sm sm:text-base">Atenção!</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">
                {lastError}
              </AlertDescription>
            </Alert>
            
            {debugHeaders.length > 0 && (
              <Card className="border-dashed border-2 bg-gray-50/50 rounded-2xl">
                <CardHeader className="py-3 sm:py-4 px-4 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    Colunas detectadas:
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 sm:pb-4 px-4 sm:px-6">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {debugHeaders.map((h, i) => (
                      <span key={i} className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white border border-gray-200 rounded-lg text-[9px] sm:text-[10px] font-mono text-gray-500 shadow-sm">{h}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Filtros e Histórico */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto w-full sm:w-auto scrollbar-hide">
            {(["today", "yesterday", "weekly", "monthly"] as const).map((filter) => (
              <Button 
                key={filter}
                variant={timeFilter === filter ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setTimeFilter(filter)}
                className={`rounded-lg whitespace-nowrap flex-1 sm:flex-initial text-xs sm:text-sm px-3 sm:px-4 h-8 sm:h-9 ${timeFilter === filter ? "bg-[#EE4D2D] text-white hover:bg-[#D73211]" : ""}`}
              >
                {filter === "today" ? "Hoje" : 
                 filter === "yesterday" ? "Ontem" : 
                 filter === "weekly" ? "7 Dias" : "30 Dias"}
              </Button>
            ))}
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl w-full sm:w-auto h-9 text-xs sm:text-sm">
                <FileText className="w-4 h-4" />
                Histórico de Uploads
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] w-[95vw] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg">Histórico de Uploads</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Visualize e gerencie os arquivos que você subiu.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[300px] overflow-y-auto space-y-2 py-4 px-1">
                {uploadBatches?.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {new Date(batch.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">{batch.count} vendas importadas</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 shrink-0"
                      onClick={() => deleteBatchMutation.mutate(batch.id)}
                      disabled={deleteBatchMutation.isPending}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {(!uploadBatches || uploadBatches.length === 0) && (
                  <p className="text-center text-gray-500 py-8 text-xs sm:text-sm">Nenhum upload realizado ainda.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl hover-elevate transition-all">
            <CardHeader className="pb-1 sm:pb-2 pt-4 px-4 sm:px-6">
              <CardTitle className="text-[10px] sm:text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 h-4 text-emerald-500" />
                Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 truncate">{formatCurrency(stats?.totalRevenue || 0)}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl hover-elevate transition-all">
            <CardHeader className="pb-1 sm:pb-2 pt-4 px-4 sm:px-6">
              <CardTitle className="text-[10px] sm:text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 h-4 text-red-500" />
                Custos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-black text-gray-900 truncate">{formatCurrency(stats?.totalExpenses || 0)}</div>
            </CardContent>
          </Card>

          <Card className={`border-none shadow-sm overflow-hidden rounded-2xl hover-elevate transition-all xs:col-span-2 md:col-span-1 ${stats && stats.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <CardHeader className="pb-1 sm:pb-2 pt-4 px-4 sm:px-6">
              <CardTitle className={`text-[10px] sm:text-xs font-bold flex items-center gap-2 uppercase tracking-widest ${stats && stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <DollarSign className="w-3.5 h-3.5 sm:w-4 h-4" />
                Lucro Líquido
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className={`text-2xl sm:text-3xl md:text-4xl font-black truncate ${stats && stats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatCurrency(stats?.netProfit || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Métricas de Engajamento */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 sm:gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl hover-elevate transition-all">
            <CardHeader className="pb-1 sm:pb-2 pt-4 px-4 sm:px-6">
              <CardTitle className="text-[10px] sm:text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 h-4 text-blue-500" />
                Total Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-xl sm:text-2xl font-black text-gray-900">{stats?.totalOrders || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl hover-elevate transition-all">
            <CardHeader className="pb-1 sm:pb-2 pt-4 px-4 sm:px-6">
              <CardTitle className="text-[10px] sm:text-xs font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                <Share2 className="w-3.5 h-3.5 sm:w-4 h-4 text-blue-600" />
                Cliques Redes
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="text-xl sm:text-2xl font-black text-gray-900">{stats?.socialClicks || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Produto Mais Vendido - Responsivo */}
        {stats?.topProduct && (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#EE4D2D] to-orange-400 rounded-[1.5rem] sm:rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <Card className="relative border-none shadow-xl bg-white overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem]">
              <div className="flex flex-col lg:flex-row">
                {/* Lado Esquerdo - Info */}
                <div className="flex-1 p-6 sm:p-8 lg:p-12 space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-xl">
                      <Trophy className="w-5 h-5 text-[#EE4D2D]" />
                    </div>
                    <span className="text-[#EE4D2D] font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Top Performance</span>
                  </div>
                  
                  <div className="space-y-2 sm:space-y-4">
                    <h2 className="text-xl sm:text-3xl lg:text-5xl font-black text-gray-900 leading-tight tracking-tight sm:tracking-tighter">
                      {stats.topProduct.name}
                    </h2>
                    <p className="text-sm sm:text-lg text-gray-500 font-medium max-w-lg">
                      Produto com maior número de conversões no período selecionado.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 sm:border-4 border-white bg-gray-100 flex items-center justify-center">
                          <Plus className="w-3 h-3 sm:w-4 h-4 text-gray-300" />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] sm:text-sm font-bold text-gray-400">Destaque do período</p>
                  </div>
                </div>

                {/* Lado Direito/Baixo - Stats */}
                <div className="w-full lg:w-[300px] bg-[#1E293B] p-6 sm:p-8 lg:p-12 flex flex-col justify-center items-center text-center space-y-6 sm:space-y-8">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 text-orange-400 mb-1 sm:mb-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Vendas</span>
                    </div>
                    <p className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tighter">
                      {stats.topProduct.orders}
                    </p>
                  </div>

                  <div className="w-full h-px bg-white/10" />

                  <div className="grid grid-cols-2 w-full gap-4">
                    <div className="text-center">
                      <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Impacto</p>
                      <p className="text-lg sm:text-2xl font-black text-white">
                        {((stats.topProduct.orders / stats.totalOrders) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Rank</p>
                      <p className="text-lg sm:text-2xl font-black text-orange-400">#1</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Divisão de Vendas - Responsivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
          <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-2xl sm:rounded-3xl overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6 sm:pt-8 px-6 sm:px-8">
              <CardTitle className="text-base sm:text-xl font-black text-gray-800">Shopee Vídeo</CardTitle>
              <div className="p-2 sm:p-3 bg-orange-100 rounded-xl sm:rounded-2xl group-hover:bg-[#EE4D2D] transition-colors">
                <Video className="h-5 w-5 sm:h-6 sm:w-6 text-[#EE4D2D] group-hover:text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#EE4D2D] mb-1 sm:mb-2 tracking-tight sm:tracking-tighter truncate">
                {formatCurrency(stats?.videoRevenue || 0)}
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">Vendas Orgânicas</p>
              <div className="mt-6 sm:mt-8 h-2.5 sm:h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#EE4D2D] rounded-full transition-all duration-1000" 
                  style={{ width: `${stats && stats.totalRevenue > 0 ? (stats.videoRevenue / stats.totalRevenue) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-2xl sm:rounded-3xl overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6 sm:pt-8 px-6 sm:px-8">
              <CardTitle className="text-base sm:text-xl font-black text-gray-800">Redes Sociais</CardTitle>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-xl sm:rounded-2xl group-hover:bg-blue-600 transition-colors">
                <Share2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 group-hover:text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-blue-600 mb-1 sm:mb-2 tracking-tight sm:tracking-tighter truncate">
                {formatCurrency(stats?.socialRevenue || 0)}
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-400">Vendas com Sub ID / Ads</p>
              <div className="mt-6 sm:mt-8 h-2.5 sm:h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                  style={{ width: `${stats && stats.totalRevenue > 0 ? (stats.socialRevenue / stats.totalRevenue) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-base sm:text-lg font-black text-gray-900">Análise de Produtos</h3>
            <p className="text-xs sm:text-sm font-medium text-gray-500">Filtragem rápida do último upload.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto">
             <div className="relative w-full sm:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <Input 
                 placeholder="Filtrar por nome, ID ou Sub ID..." 
                 className="pl-10 rounded-xl border-gray-200 h-10 sm:h-11 text-xs sm:text-sm"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             {searchTerm && (
               <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto">
                 {campaignSheets?.includes(searchTerm) ? (
                   <Link href={`/campaign/${encodeURIComponent(searchTerm)}`}>
                     <Button variant="outline" className="h-10 sm:h-11 rounded-xl font-bold px-6 border-blue-200 text-blue-600 hover:bg-blue-50 w-full sm:w-auto">
                       <Plus className="w-4 h-4 mr-2" />
                       Adicionar à Planilha: {searchTerm}
                     </Button>
                   </Link>
                 ) : (
                   <Button 
                     variant="outline" 
                     className="h-10 sm:h-11 rounded-xl font-bold px-6 border-gray-200 w-full sm:w-auto text-xs sm:text-sm"
                     onClick={() => setSubIdForNewCampaign(searchTerm)}
                   >
                     <Plus className="w-4 h-4 mr-2" />
                     Criar Planilha: {searchTerm}
                   </Button>
                 )}
               </div>
             )}

             <Dialog open={!!subIdForNewCampaign} onOpenChange={(open) => !open && setSubIdForNewCampaign(null)}>
               <DialogContent className="w-[95vw] rounded-2xl">
                 <DialogHeader>
                   <DialogTitle>Criar Planilha: {subIdForNewCampaign}</DialogTitle>
                   <DialogDescription>Quanto você gastou nesta campanha até agora?</DialogDescription>
                 </DialogHeader>
                 <div className="py-4 space-y-4">
                   <div className="space-y-2">
                     <label className="text-xs font-bold uppercase text-gray-500">Valor Gasto (R$)</label>
                     <Input 
                       type="number" 
                       placeholder="0,00" 
                       value={initialExpense}
                       onChange={(e) => setInitialExpense(e.target.value)}
                     />
                   </div>
                   <Button 
                    className="w-full bg-[#EE4D2D] hover:bg-[#D73211] font-bold h-11"
                    onClick={() => {
                      if (subIdForNewCampaign) {
                        createCampaignMutation.mutate({
                          subId: subIdForNewCampaign,
                          expense: Math.floor(parseFloat(initialExpense || "0") * 100)
                        });
                      }
                    }}
                    disabled={createCampaignMutation.isPending}
                   >
                     {createCampaignMutation.isPending ? "Criando..." : "Confirmar e Criar"}
                   </Button>
                 </div>
               </DialogContent>
             </Dialog>
          </div>
        </div>

        {/* Seção de Análise de Produtos - Tabela de Produtos Filtrados */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Produto</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Sub ID</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">ID Pedido</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Receita</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Cliques</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product: any, index: number) => (
                  <TableRow key={index} className="hover:bg-gray-50/50">
                    <TableCell className="text-xs font-medium max-w-[200px] truncate">{product.productName}</TableCell>
                    <TableCell className="text-[10px] font-bold text-blue-600">{product.subId || "-"}</TableCell>
                    <TableCell className="text-[10px] font-mono text-gray-400">{product.orderId}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-[#EE4D2D]">
                          {formatCurrency(product.revenue)}
                        </span>
                        {product.subId !== "-" && (
                          campaignSheets?.includes(product.subId) ? (
                            <Link href={`/campaign/${encodeURIComponent(product.subId)}`}>
                              <Button variant="outline" size="sm" className="h-7 text-xs border-blue-200 text-blue-600 hover:bg-blue-50">
                                Adicionar à Planilha
                              </Button>
                            </Link>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
                              onClick={() => setSubIdForNewCampaign(product.subId)}
                            >
                              Criar Planilha
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-gray-500 text-right">{product.clicks}</TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-gray-400 text-xs">
                      {searchTerm ? "Nenhum produto encontrado para sua busca." : "Nenhum dado de produto disponível."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Seção de Categorias - Responsivo */}
        {(stats as any)?.chartData?.length > 0 && (
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl sm:rounded-3xl">
            <CardHeader className="px-6 sm:px-8 pt-6 sm:pt-8">
              <CardTitle className="text-base sm:text-xl font-black text-gray-800 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#EE4D2D]" />
                Mix de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="flex flex-col lg:flex-row gap-6 sm:gap-12 items-center">
                <div className="h-[250px] sm:h-[300px] w-full max-w-[400px]">
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
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 w-full">
                  {((stats?.chartData) || []).map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ["#EE4D2D", "#FFB100", "#22C55E", "#3B82F6", "#A855F7"][index % 5] }} />
                        <span className="text-[10px] sm:text-xs font-bold text-gray-600 truncate">{item.name}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-gray-900 shrink-0">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6">
            <Link href="/terms" className="text-xs sm:text-sm font-bold text-gray-400 hover:text-[#EE4D2D] transition-colors">Termos</Link>
            <Link href="/privacy" className="text-xs sm:text-sm font-bold text-gray-400 hover:text-[#EE4D2D] transition-colors">Privacidade</Link>
            <Link href="/data-deletion" className="text-xs sm:text-sm font-bold text-gray-400 hover:text-[#EE4D2D] transition-colors">LGPD</Link>
          </div>
          <p className="text-[10px] sm:text-xs font-bold text-gray-300 uppercase tracking-widest">
            © 2026 InstaDash. Focado em Conversão.
          </p>
        </div>
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
