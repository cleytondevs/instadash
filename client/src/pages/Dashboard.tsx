import { useLocation } from "wouter";
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
  PieChart,
  MousePointerClick
} from "lucide-react";
import { useState, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [timeFilter, setTimeFilter] = useState<"today" | "yesterday" | "weekly" | "monthly">("today");

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) toast({ variant: "destructive", title: "Erro no Cadastro", description: error.message });
      else toast({ title: "Sucesso!", description: "Verifique seu e-mail para confirmar o cadastro." });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast({ variant: "destructive", title: "Erro no Login", description: error.message });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Sessão encerrada" });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugHeaders, setDebugHeaders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [localProducts, setLocalProducts] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("last_upload_products");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [fbConfig, setFbConfig] = useState({ appId: "", appSecret: "" });
  const [isConnectingFb, setIsConnectingFb] = useState(false);
  const [subIdForNewCampaign, setSubIdForNewCampaign] = useState<string | null>(null);
  const [initialExpense, setInitialExpense] = useState("");

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<any>({
    queryKey: ["dashboard-stats", timeFilter, user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const [salesRes, expensesRes] = await Promise.all([
          supabase.from("sales").select("*").eq("user_id", user.id).order('order_date', { ascending: false }),
          supabase.from("expenses").select("*").eq("user_id", user.id)
        ]);

        const salesData = salesRes.data || [];
        
        // Filtro rigoroso para o processamento de estatísticas no backend/supabase
        const validSalesData = salesData.filter(s => 
          s.product_name && 
          s.product_name.trim() !== "" && 
          s.product_name !== "Produto" &&
          (Number(s.revenue) || 0) > 0
        );

        if (validSalesData.length > 0) {
          localStorage.setItem("last_upload_products", JSON.stringify(validSalesData));
        }

        const expensesData = expensesRes.data || [];

        if (salesRes.error || expensesRes.error) {
          console.error("Erro na busca de dados (Supabase):", salesRes.error || expensesRes.error);
          return null;
        }

        const now = new Date();
        const filteredSales = validSalesData.filter(s => {
          const d = new Date(s.order_date);
          if (timeFilter === "today") return d.toDateString() === now.toDateString();
          if (timeFilter === "yesterday") {
            const y = new Date(now); y.setDate(now.getDate() - 1);
            return d.toDateString() === y.toDateString();
          }
          if (timeFilter === "weekly") {
            const w = new Date(now); w.setDate(now.getDate() - 7);
            return d >= w;
          }
          if (timeFilter === "monthly") {
            const m = new Date(now); m.setMonth(now.getMonth() - 1);
            return d >= m;
          }
          return true;
        });

        const videoRevenue = filteredSales
          .filter((s: any) => s.source === 'shopee_video')
          .reduce((sum: number, s: any) => sum + (Number(s.revenue) || 0), 0);

        const socialRevenue = filteredSales
          .filter((s: any) => s.source === 'social_media')
          .reduce((sum: number, s: any) => sum + (Number(s.revenue) || 0), 0);

        const totalRevenue = videoRevenue + socialRevenue;
        const totalExpenses = (expensesData || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
        
        const productCounts: Record<string, number> = {};
        filteredSales.forEach((sale: any) => {
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

        return {
          totalRevenue,
          videoRevenue,
          socialRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          totalOrders: filteredSales.length,
          totalClicks: filteredSales.reduce((sum: number, s: any) => sum + (Number(s.clicks) || 0), 0),
          socialClicks: filteredSales
            .filter((s: any) => s.source === 'social_media')
            .reduce((sum: number, s: any) => sum + (Number(s.clicks) || 0), 0),
          topProduct,
          chartData: Object.entries(categorySummary).map(([name, value]) => ({ name, value })),
          salesData: filteredSales
        };
      } catch (err) {
        console.error("Erro crítico na Dashboard:", err);
        throw err;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  const uploadMutation = useMutation({
    mutationFn: async (sales: any[]) => {
      if (!user) throw new Error("Usuário não autenticado");
      try {
        const batchId = `upload_${Date.now()}`;
        const salesToInsert = sales.map(s => ({
          user_id: user.id,
          order_id: s.orderId,
          product_name: s.productName,
          revenue: s.revenue,
          clicks: s.clicks,
          source: s.source,
          sub_id: s.subId,
          order_date: s.orderDate,
          batch_id: batchId
        }));
        
        const { error: insertError } = await supabase
          .from("sales")
          .upsert(salesToInsert, { onConflict: 'order_id' });

        if (insertError) throw insertError;
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
          const productName = getVal(["Nome do Produto", "Product Name", "Nome", "Descrição do produto", "Product", "Product Name (Optional)"]);
          const rawClicks = getVal(["Cliques gerados pelos links promocionais do afiliado", "Cliques no produto", "Cliques", "Clicks", "Número de cliques", "Visualizações de página", "Product Clicks", "Item Clicks"]);
          
          if (!orderId) return null;

          let revenueCents = 0;
          if (rawRevenue) {
            const cleanRevenue = String(rawRevenue).replace(/[R$\s]/g, "").replace(",", ".");
            revenueCents = Math.floor(parseFloat(cleanRevenue) * 100);
          }

          // Se não tiver nome, ou for o nome genérico "Produto", ou a receita for zero, descartamos
          if (!productName || String(productName).trim() === "" || String(productName).trim() === "Produto" || revenueCents <= 0) {
            return null;
          }

          const source = subId ? "social_media" : "shopee_video";
          
          return {
            orderId: String(orderId).trim(),
            subId: subId ? String(subId).trim() : "-",
            orderDate: rawDate || new Date().toISOString(),
            revenue: revenueCents,
            source: source,
            productName: String(productName).trim(),
            clicks: parseInt(String(rawClicks || "0"), 10) || 0
          };
        }).filter(s => s !== null);

        if (sales.length === 0) {
          setLastError("A planilha não contém dados válidos de vendas (pedidos com nome e receita). Verifique o arquivo.");
          toast({
            variant: "destructive",
            title: "Planilha Inválida",
            description: "Nenhum dado de venda válido foi encontrado na planilha.",
          });
          return;
        }

        uploadMutation.mutate(sales);
        setLocalProducts(sales);
        localStorage.setItem("last_upload_products", JSON.stringify(sales));
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
    queryKey: ["tracked-links", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("tracked_links")
        .select("*")
        .eq("user_id", user.id)
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
          user_id: user.id,
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
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    (window as any).FB.api(
      '/me/adaccounts',
      'GET',
      { fields: 'id,name,account_id' },
      (response: any) => {
        if (response && !response.error) {
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

  const { data: campaignStats } = useQuery({
    queryKey: ["campaign-sheets-stats", timeFilter],
    queryFn: async () => {
      if (!user) return [];
      
      // Busca todas as vendas do usuário que possuem sub_id preenchido
      const { data: allSales, error: salesError } = await supabase
        .from("sales")
        .select("revenue, sub_id, product_name, order_date")
        .eq("user_id", user.id)
        .not("sub_id", "is", null)
        .not("sub_id", "eq", "-");

      if (salesError) throw salesError;

      const now = new Date();
      
      // Filtra as vendas pelo período selecionado e validade dos dados
      const validSales = (allSales || []).filter(s => {
        // Validação básica de dados (mesmo filtro usado no resto do app)
        const hasValidName = s.product_name && 
          s.product_name.trim() !== "" && 
          s.product_name !== "Produto";
        const hasValidRevenue = (Number(s.revenue) || 0) > 0;
        
        if (!hasValidName || !hasValidRevenue) return false;

        // Filtro de tempo
        const d = new Date(s.order_date);
        if (timeFilter === "today") return d.toDateString() === now.toDateString();
        if (timeFilter === "yesterday") {
          const y = new Date(now); y.setDate(now.getDate() - 1);
          return d.toDateString() === y.toDateString();
        }
        if (timeFilter === "weekly") {
          const w = new Date(now); w.setDate(now.getDate() - 7);
          return d >= w;
        }
        if (timeFilter === "monthly") {
          const m = new Date(now); m.setMonth(now.getMonth() - 1);
          return d >= m;
        }
        return true;
      });

      // Agrupa a receita por Sub ID
      const revenueBySubId: Record<string, number> = {};
      validSales.forEach(sale => {
        const subId = sale.sub_id;
        revenueBySubId[subId] = (revenueBySubId[subId] || 0) + sale.revenue;
      });

      // Transforma em array para o gráfico
      return Object.entries(revenueBySubId)
        .map(([subId, revenue]) => ({ subId, revenue }))
        .sort((a, b) => b.revenue - a.revenue);
    }
  });

  const { data: campaignSheets } = useQuery({
    queryKey: ["campaign-sheets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("campaign_sheets").select("sub_id").eq("user_id", user.id);
      if (error) throw error;
      return (data || []).map(s => s.sub_id);
    },
    enabled: !!user
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: { subId: string, expense: number }) => {
      const { data: existing } = await supabase
        .from("campaign_sheets")
        .select("id")
        .eq("sub_id", data.subId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        throw new Error("Já existe uma planilha para este Sub ID.");
      }

      const { data: sheet, error: sheetError } = await supabase
        .from("campaign_sheets")
        .insert([{ sub_id: data.subId, user_id: user.id }])
        .select()
        .single();
      
      if (sheetError) throw sheetError;

      if (data.expense > 0) {
        const { error: expError } = await supabase
          .from("campaign_expenses")
          .insert([{
            campaign_sheet_id: sheet.id,
            amount: data.expense,
            description: "Gasto Inicial",
            date: new Date().toISOString().split('T')[0]
          }]);
        if (expError) throw expError;
      }

      return sheet;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-sheets", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["campaign-sheets-stats"] });
      toast({ title: "Sucesso", description: "Planilha de campanha criada." });
      setLocation(`/campaign/${encodeURIComponent(data.sub_id)}`);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar",
        description: error.message
      });
    }
  });

  const filteredProducts = useMemo(() => {
    const dataToFilter = localProducts.length > 0 ? localProducts : (stats?.salesData || []);
    if (!dataToFilter.length) return [];
    
    const products = dataToFilter
      .map((p: any) => {
        const subIdValue = p.sub_id || p.subId || p.subid || p["Sub ID"] || p["Sub-ID"];
        return {
          productName: p.product_name || p.productName || p.Nome || p.Product,
          orderId: p.order_id || p.orderId || p.ID || p["Order ID"],
          subId: subIdValue && subIdValue !== "-" ? String(subIdValue).trim() : "-",
          revenue: p.revenue,
          clicks: p.clicks,
          orderDate: p.order_date || p.orderDate || p.Data || p["Order Date"] || p.orderTime || p.orderCreationDate
        };
      })
      .filter((p: any) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = (
          p.productName?.toLowerCase().includes(search) ||
          p.orderId?.toLowerCase().includes(search) ||
          p.subId?.toLowerCase().includes(search)
        );

        if (!matchesSearch) return false;

        // Filtro adicional para remover produtos sem nome ou com receita zero
        const hasValidName = p.productName && 
          p.productName.trim() !== "" && 
          p.productName !== "Produto";
        
        const hasValidRevenue = p.revenue > 0;

        if (!hasValidName || !hasValidRevenue) return false;

        const productDate = new Date(p.orderDate);
        const now = new Date();
        
        if (timeFilter === "today") {
          return productDate.toDateString() === now.toDateString();
        } else if (timeFilter === "yesterday") {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          return productDate.toDateString() === yesterday.toDateString();
        } else if (timeFilter === "weekly") {
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(now.getDate() - 7);
          return productDate >= oneWeekAgo;
        } else if (timeFilter === "monthly") {
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(now.getMonth() - 1);
          return productDate >= oneMonthAgo;
        }
        
        return true;
      });

    return products.sort((a: any, b: any) => {
      const aHasSubId = a.subId && a.subId !== "-";
      const bHasSubId = b.subId && b.subId !== "-";
      if (aHasSubId && !bHasSubId) return -1;
      if (!aHasSubId && bHasSubId) return 1;
      if (aHasSubId && bHasSubId) return a.subId.localeCompare(b.subId);
      return 0;
    });
  }, [stats?.salesData, localProducts, searchTerm, timeFilter]);

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
    queryKey: ["upload-batches", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("batch_id, upload_date")
        .eq("user_id", user.id)
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
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EE4D2D]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-950 p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-[#EE4D2D]/10 p-3 rounded-2xl">
                <BarChart3 className="w-8 h-8 text-[#EE4D2D]" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
              InstaDash
            </CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400 font-medium">
              Entre para gerenciar suas vendas da Shopee
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="rounded-xl border-zinc-200 focus:ring-[#EE4D2D] focus:border-[#EE4D2D]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="rounded-xl border-zinc-200 focus:ring-[#EE4D2D] focus:border-[#EE4D2D]"
                />
              </div>
              <Button type="submit" className="w-full bg-[#EE4D2D] hover:bg-[#D73211] text-white font-bold h-11 rounded-xl transition-all shadow-md active:scale-[0.98]">
                {authMode === "login" ? "Entrar" : "Criar Conta"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              variant="link" 
              className="text-zinc-500 hover:text-[#EE4D2D] font-bold"
              onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
            >
              {authMode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre aqui"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 sm:pb-20 font-sans">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer">
            <div className="bg-[#EE4D2D] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tighter leading-none">InstaDash</h1>
              <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Analytics Pro</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block text-right mr-2">
              <p className="text-xs font-black text-gray-900 truncate max-w-[150px]">{user.email}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Dashboard Ativo</p>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl border-gray-200 hover:bg-gray-50 h-9 w-9 sm:h-10 sm:w-10 transition-colors">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-lg rounded-2xl sm:rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 sm:p-8 text-white">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2 flex items-center gap-2">
                    <FileText className="w-6 h-6" /> Gerenciamento de Planilha
                  </h2>
                  <p className="text-blue-100 text-sm font-medium opacity-90">Gerencie seus uploads e organize seus dados de vendas.</p>
                </div>
                
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Package className="w-4 h-4" /> Histórico de Uploads
                    </h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {uploadBatches?.map((batch) => (
                        <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter truncate">{batch.id}</p>
                            <p className="text-xs font-bold text-gray-700">{new Date(batch.date).toLocaleDateString('pt-BR')} • {batch.count} vendas</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg h-8 w-8"
                            onClick={() => deleteBatchMutation.mutate(batch.id)}
                            disabled={deleteBatchMutation.isPending}
                          >
                            <TrendingDown className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {(!uploadBatches || uploadBatches.length === 0) && (
                        <p className="text-center py-4 text-xs font-medium text-gray-400 italic">Nenhum upload realizado ainda.</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 flex flex-col gap-3">
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full bg-[#EE4D2D] hover:bg-[#D73211] text-white font-bold h-11 rounded-xl flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {isUploading ? "Enviando..." : "Subir Nova Planilha"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl border-gray-200 hover:bg-gray-50 h-9 w-9 sm:h-10 sm:w-10 transition-colors">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-lg rounded-2xl sm:rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 sm:p-8 text-white">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6" /> Painel de Campanhas
                  </h2>
                  <p className="text-indigo-100 text-sm font-medium opacity-90">Acompanhe e gerencie o desempenho das suas campanhas ativas.</p>
                </div>
                
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <PieChart className="w-4 h-4" /> Resumo de Performance
                    </h3>
                    <div className="space-y-3">
                      {campaignStats?.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ["#EE4D2D", "#FFB100", "#22C55E", "#3B82F6", "#A855F7"][index % 5] }} />
                            <span className="text-sm font-bold text-gray-700">{item.subId}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-gray-900">{formatCurrency(item.revenue)}</p>
                          </div>
                        </div>
                      ))}
                      {(!campaignStats || campaignStats.length === 0) && (
                        <p className="text-center py-4 text-xs font-medium text-gray-400 italic">Nenhuma campanha ativa no momento.</p>
                      )}
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    onClick={handleLogout}
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 font-black h-11 rounded-xl mt-4"
                  >
                    Encerrar Sessão
                  </Button>
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
              disabled={isUploading}
              className="bg-[#EE4D2D] hover:bg-[#D73211] text-white font-bold px-4 sm:px-6 rounded-xl sm:rounded-2xl h-10 sm:h-12 flex items-center gap-2 shadow-lg shadow-orange-100 transition-all active:scale-95 text-xs sm:text-sm"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? "Enviando..." : "Subir Planilha"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tighter">Olá! 🚀</h2>
            <p className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest">Aqui está o resumo do seu lucro</p>
          </div>
          
          <div className="inline-flex p-1 bg-white border border-gray-100 rounded-xl sm:rounded-2xl shadow-sm w-full sm:w-auto">
            {(["today", "yesterday", "weekly", "monthly"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                  timeFilter === filter 
                    ? "bg-[#EE4D2D] text-white shadow-md shadow-orange-100" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
              >
                {filter === "today" ? "Hoje" : filter === "yesterday" ? "Ontem" : filter === "weekly" ? "7 Dias" : "30 Dias"}
              </button>
            ))}
          </div>
        </div>

        {lastError && (
          <Alert variant="destructive" className="rounded-2xl sm:rounded-3xl border-none shadow-lg bg-red-50 text-red-900 animate-in fade-in slide-in-from-top-4 duration-500">
            <AlertCircle className="h-5 w-5 !text-red-600" />
            <AlertTitle className="font-black text-red-600">Ocorreu um erro</AlertTitle>
            <AlertDescription className="font-medium opacity-90">{lastError}</AlertDescription>
          </Alert>
        )}

        {/* KPI Cards removed by user request */}

        {stats?.topProduct && (
          <div className="animate-in fade-in zoom-in duration-700 delay-200">
            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-3xl group relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 transition-all group-hover:bg-orange-100 group-hover:scale-110 duration-700"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-50 rounded-full -ml-24 -mb-24 blur-3xl opacity-50 transition-all group-hover:bg-blue-100 group-hover:scale-110 duration-700"></div>
              
              <div className="relative p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8 sm:gap-12">
                <div className="relative">
                  <div className="bg-gradient-to-br from-orange-400 to-[#EE4D2D] p-5 sm:p-7 rounded-[2.5rem] shadow-2xl shadow-orange-200 group-hover:rotate-6 transition-transform duration-500">
                    <Trophy className="h-10 w-10 sm:h-14 sm:w-14 text-white drop-shadow-md" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg border-2 border-white uppercase tracking-tighter">
                    Top #1
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <span className="h-1 w-4 bg-[#EE4D2D] rounded-full"></span>
                      <p className="text-[10px] sm:text-xs font-black text-[#EE4D2D] uppercase tracking-[0.3em]">Produto Campeão</p>
                    </div>
                    <h3 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter leading-none">
                      {stats.topProduct.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                    <div className="bg-gray-50/80 backdrop-blur-sm px-5 py-3 rounded-2xl border border-gray-100 group-hover:border-orange-100 transition-colors">
                      <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total de Vendas</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-xl sm:text-3xl font-black text-gray-900">{stats.topProduct.orders}</p>
                        <span className="text-[10px] font-bold text-gray-400">pedidos</span>
                      </div>
                    </div>

                    <div className="bg-gray-50/80 backdrop-blur-sm px-5 py-3 rounded-2xl border border-gray-100 group-hover:border-blue-100 transition-colors">
                      <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Participação</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-xl sm:text-3xl font-black text-blue-600">
                          {((stats.topProduct.orders / stats.totalOrders) * 100).toFixed(0)}%
                        </p>
                        <span className="text-[10px] font-bold text-gray-400">do total</span>
                      </div>
                    </div>
                    
                    <div className="hidden lg:block h-12 w-px bg-gray-100 mx-2"></div>

                    <div className="flex flex-col items-center md:items-start">
                      <p className="text-[9px] sm:text-[10px] font-black text-[#EE4D2D] uppercase tracking-widest mb-1">Performance</p>
                      <div className="flex -space-x-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Sparkles key={star} className="w-5 h-5 text-orange-400 fill-orange-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden xl:flex flex-col items-end justify-center">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Conversão Estimada</p>
                    <p className="text-5xl font-black text-gray-900 tracking-tighter">
                      High
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

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
             {searchTerm && timeFilter === "today" && (
               <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto">
                 {campaignSheets?.includes(searchTerm.trim()) ? (
                   <Link href={`/campaign/${encodeURIComponent(searchTerm.trim())}`}>
                     <Button variant="outline" className="h-10 sm:h-11 rounded-xl font-bold px-6 border-blue-200 text-blue-600 hover:bg-blue-50 w-full sm:w-auto">
                       <Plus className="w-4 h-4 mr-2" />
                       Adicionar à Planilha: {searchTerm}
                     </Button>
                   </Link>
                 ) : (
                   <Button 
                     variant="outline" 
                     className="h-10 sm:h-11 rounded-xl font-bold px-6 border-gray-200 w-full sm:w-auto text-xs sm:text-sm"
                     onClick={() => setSubIdForNewCampaign(searchTerm.trim())}
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
                   <DialogDescription>
                     Informe o gasto inicial para esta nova campanha com Sub ID {subIdForNewCampaign}.
                   </DialogDescription>
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

        {filteredProducts.length > 0 && (
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
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-gray-500 text-right">{product.clicks}</TableCell>
                    </TableRow>
                  ))}
                  {filteredProducts.length > 0 && (
                    <TableRow className="bg-gray-50/50 border-t-2 border-gray-100">
                      <TableCell colSpan={3} className="text-xs font-black text-gray-900 uppercase tracking-wider">Total Filtrado</TableCell>
                      <TableCell className="text-right font-black text-[#EE4D2D]">
                        {formatCurrency(filteredProducts.reduce((sum: number, p: any) => sum + p.revenue, 0))}
                      </TableCell>
                      <TableCell className="text-right font-black text-gray-900">
                        {filteredProducts.reduce((sum: number, p: any) => sum + p.clicks, 0)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {campaignStats && campaignStats.length > 0 && (
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl sm:rounded-3xl">
            <CardHeader className="px-6 sm:px-8 pt-6 sm:pt-8">
              <CardTitle className="text-base sm:text-xl font-black text-gray-800 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#EE4D2D]" />
                Vendas por Sub ID
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="flex flex-col lg:flex-row gap-6 sm:gap-12 items-center">
                <div className="h-[250px] sm:h-[300px] w-full max-w-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                        <Pie
                          data={campaignStats.map(s => ({ name: s.subId, value: s.revenue }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {campaignStats.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={["#EE4D2D", "#FFB100", "#22C55E", "#3B82F6", "#A855F7"][index % 5]} />
                          ))}
                        </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 w-full">
                  {campaignStats.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ["#EE4D2D", "#FFB100", "#22C55E", "#3B82F6", "#A855F7"][index % 5] }} />
                        <span className="text-[10px] sm:text-xs font-bold text-gray-600 truncate">{item.subId}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-gray-900 shrink-0">{formatCurrency(item.revenue)}</span>
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
