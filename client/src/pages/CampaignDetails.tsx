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
      setExpenseAmount("");
      toast({ title: "Sucesso", description: "Gasto adicionado." });
    }
  });

  const totalRevenue = sales?.reduce((sum, s) => sum + s.revenue, 0) || 0;
  const totalExpenses = campaign?.campaign_expenses?.reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
  const netProfit = totalRevenue - totalExpenses;

  if (loadingCampaign || loadingSales) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          </Link>
          <h1 className="text-xl font-bold truncate max-w-[200px] sm:max-w-none">Campanha: {subId}</h1>
          <div className="w-10"></div>
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
            <CardTitle className="text-lg">Adicionar Gasto</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input 
                type="number" 
                placeholder="Valor (Ex: 50.00)" 
                value={expenseAmount} 
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input 
                type="date" 
                value={expenseDate} 
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
            <Button onClick={() => addExpenseMutation.mutate()} disabled={addExpenseMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Gastos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaign?.campaign_expenses?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                      Nenhum gasto registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaign?.campaign_expenses?.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(e.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        R$ {(e.amount / 100).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
