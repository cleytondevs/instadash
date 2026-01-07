import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, DollarSign, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function CampaignDetails() {
  const [, params] = useRoute("/campaign/:subId");
  const subId = decodeURIComponent(params?.subId || "");
  const { toast } = useToast();
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: campaign, isLoading: loadingCampaign } = useQuery({
    queryKey: ["campaign-sheet", subId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_sheets")
        .select("*, campaign_expenses(*)")
        .eq("sub_id", subId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const updateCampaignTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const { data, error } = await supabase
        .from("campaign_sheets")
        .update({ title: newTitle })
        .eq("sub_id", subId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-sheet", subId] });
      toast({ title: "Sucesso", description: "Título atualizado." });
    }
  });

  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ["campaign-sales", subId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("sub_id", subId);
      if (error) throw error;
      return data || [];
    }
  });

  const addExpenseMutation = useMutation({
    mutationFn: async () => {
      if (!campaign) throw new Error("Campanha não encontrada");
      const amountCents = Math.floor(parseFloat(expenseAmount) * 100);
      const { data, error } = await supabase
        .from("campaign_expenses")
        .insert([{
          campaign_sheet_id: campaign.id,
          amount: amountCents,
          date: expenseDate
        }]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-sheet", subId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-sheets-stats"] });
      setExpenseAmount("");
      toast({ title: "Sucesso", description: "Gasto adicionado." });
    }
  });

  const totalRevenue = sales?.reduce((sum, s) => sum + s.revenue, 0) || 0;
  const totalExpenses = campaign?.campaign_expenses?.reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
  const netProfit = totalRevenue - totalExpenses;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const dailySales = sales?.reduce((acc: Record<string, number>, sale) => {
    const date = new Date(sale.order_date).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + sale.revenue;
    return acc;
  }, {}) || {};

  const dailyExpenses = campaign?.campaign_expenses?.reduce((acc: Record<string, number>, exp: any) => {
    acc[exp.date] = (acc[exp.date] || 0) + exp.amount;
    return acc;
  }, {}) || {};

  const allDates = Array.from(new Set([...Object.keys(dailySales), ...Object.keys(dailyExpenses)])).sort().reverse();

  if (loadingCampaign || loadingSales) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          </Link>
          <div className="flex-1 flex items-center gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <Input 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  placeholder="Nome da Campanha"
                  className="h-8 text-sm"
                />
                <Button 
                  size="sm" 
                  onClick={() => {
                    updateCampaignTitleMutation.mutate(newTitle);
                    setIsEditingTitle(false);
                  }}
                >Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(false)}>X</Button>
              </div>
            ) : (
              <h1 
                className="text-xl font-bold truncate cursor-pointer hover:text-blue-600"
                onClick={() => {
                  setNewTitle(campaign?.title || "");
                  setIsEditingTitle(true);
                }}
              >
                {campaign?.title || `Campanha: ${subId}`}
              </h1>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-green-50 border-green-100">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-600 font-medium">Faturamento</p>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-700">R$ {(totalRevenue / 100).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-100">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-600 font-medium">Gastos</p>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-700">R$ {(totalExpenses / 100).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className={`${netProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Lucro Líquido</p>
                <DollarSign className="w-4 h-4" />
              </div>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                R$ {(netProfit / 100).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-black">Lançar Novo Gasto</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Valor</label>
              <Input 
                type="number" 
                placeholder="0,00" 
                value={expenseAmount} 
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Data</label>
              <Input 
                type="date" 
                value={expenseDate} 
                onChange={(e) => setExpenseDate(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => addExpenseMutation.mutate()} 
                disabled={addExpenseMutation.isPending}
                className="h-11 rounded-xl px-8 bg-[#EE4D2D] hover:bg-[#D73211] font-bold"
              >
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-sm rounded-2xl">
          <CardHeader className="bg-white border-b border-gray-100">
            <CardTitle className="text-lg font-black">Balanço Diário</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="font-bold text-gray-900">Data</TableHead>
                  <TableHead className="text-right font-bold text-green-600">Ganhos</TableHead>
                  <TableHead className="text-right font-bold text-red-500">Gastos</TableHead>
                  <TableHead className="text-right font-bold text-gray-900">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allDates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-gray-400 font-medium">
                      Nenhuma movimentação registrada para este Sub ID.
                    </TableCell>
                  </TableRow>
                ) : (
                  allDates.map((date) => {
                    const gain = dailySales[date] || 0;
                    const loss = dailyExpenses[date] || 0;
                    const balance = gain - loss;
                    return (
                      <TableRow key={date} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium text-gray-600">
                          {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          R$ {(gain / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-500">
                          R$ {(loss / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-black ${balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          R$ {(balance / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
