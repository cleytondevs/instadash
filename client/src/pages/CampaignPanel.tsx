import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { 
  BarChart3, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  Calendar,
  Plus,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CampaignPanel() {
  const [, params] = useRoute("/campaign/:subId");
  const subId = decodeURIComponent(params?.subId || "");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newExpense, setNewExpense] = useState("");

  const { data: campaignData, isLoading } = useQuery({
    queryKey: ["campaign-details", subId],
    queryFn: async () => {
      const { data: sheet } = await supabase
        .from("campaign_sheets")
        .select("*")
        .eq("sub_id", subId)
        .single();

      const { data: sales } = await supabase
        .from("sales")
        .select("*")
        .eq("sub_id", subId);

      const { data: expenses } = await supabase
        .from("campaign_expenses")
        .select("*")
        .eq("campaign_sheet_id", sheet?.id)
        .order("date", { ascending: false });

      const totalRevenue = sales?.reduce((sum, s) => sum + s.revenue, 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const profit = totalRevenue - totalExpenses;
      const roi = totalExpenses > 0 ? (profit / totalExpenses) * 100 : 0;

      return {
        sheet,
        sales: sales || [],
        expenses: expenses || [],
        stats: {
          totalRevenue,
          totalExpenses,
          profit,
          roi
        }
      };
    },
    enabled: !!subId
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!campaignData?.sheet?.id) throw new Error("Campanha não encontrada");
      const { error } = await supabase
        .from("campaign_expenses")
        .insert([{
          campaign_sheet_id: campaignData.sheet.id,
          amount,
          date: new Date().toISOString().split('T')[0],
          description: "Gasto Manual"
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-details", subId] });
      setNewExpense("");
      toast({ title: "Sucesso", description: "Gasto adicionado!" });
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("campaign_expenses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-details", subId] });
      toast({ title: "Sucesso", description: "Gasto removido!" });
    }
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-2 font-bold">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="text-center">
            <h1 className="text-lg font-black text-gray-900 tracking-tighter">{subId}</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Painel Individual</p>
          </div>
          <div className="w-20" /> 
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-2xl border-none shadow-sm bg-white">
            <CardContent className="p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Faturamento</p>
              <h3 className="text-xl font-black text-gray-900">{formatCurrency(campaignData?.stats.totalRevenue || 0)}</h3>
            </CardContent>
          </Card>
          <Card className={`rounded-2xl border-none shadow-sm ${campaignData?.stats.profit! >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <CardContent className="p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lucro Líquido</p>
              <h3 className={`text-xl font-black ${campaignData?.stats.profit! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(campaignData?.stats.profit || 0)}
              </h3>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#EE4D2D]" /> Registrar Gasto
                </CardTitle>
                <CardDescription className="text-xs font-medium">Lance seus custos diários aqui</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">R$</span>
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="0,00"
                  className="h-12 pl-10 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white transition-all font-bold text-lg"
                  value={newExpense}
                  onChange={(e) => setNewExpense(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => newExpense && addExpenseMutation.mutate(Math.floor(parseFloat(newExpense) * 100))}
                className="h-12 px-6 rounded-2xl bg-[#EE4D2D] hover:bg-[#D73211] text-white font-black"
                disabled={addExpenseMutation.isPending}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-6 border-b border-gray-50">
            <CardTitle className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" /> Histórico de Gastos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50">
              {campaignData?.expenses.map((expense) => (
                <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-gray-700">{formatCurrency(expense.amount)}</p>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tighter">
                      {new Date(expense.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-300 hover:text-red-500 rounded-xl"
                    onClick={() => deleteExpenseMutation.mutate(expense.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {campaignData?.expenses.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-xs font-medium text-gray-400 italic">Nenhum gasto registrado.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
