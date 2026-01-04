import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Política de Privacidade</h1>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
        </div>

        <section className="space-y-4 text-gray-600 leading-relaxed">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm font-medium">
            O InstaDash é uma ferramenta independente. Este aplicativo não é um produto oficial da Meta Platforms, Inc. e não possui vínculo societário com a mesma.
          </div>

          <h2 className="text-lg font-bold text-gray-900 pt-4">1. Informações Gerais</h2>
          <p>
            O InstaDash é uma ferramenta de análise de dados para anúncios de redes sociais. Somos uma aplicação que utiliza as APIs oficiais da Meta para fornecer métricas consolidadas aos nossos usuários através de vinculação técnica.
          </p>

          <h2 className="text-lg font-bold text-gray-900 pt-4">2. Coleta de Dados</h2>
          <p>
            Coletamos apenas as informações necessárias para o funcionamento do dashboard através da API do Facebook, incluindo:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Nome e ID das campanhas de anúncios.</li>
            <li>Métricas de desempenho (gasto, impressões, cliques, receita).</li>
            <li>Nome e foto do perfil (via login) para personalização da interface.</li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 pt-4">3. Uso das Informações</h2>
          <p>
            Os dados coletados são utilizados exclusivamente para exibição no seu dashboard pessoal. Não vendemos ou compartilhamos seus dados de anúncios com terceiros. Toda a análise é feita em tempo real para sua gestão.
          </p>

          <h2 className="text-lg font-bold text-gray-900 pt-4">4. Segurança e Vinculação</h2>
          <p>
            Utilizamos conexões seguras (HTTPS) para todas as comunicações com as APIs da Meta. Seus tokens de acesso são tratados com segurança e você pode revogar o acesso a qualquer momento através das configurações de segurança do seu Facebook.
          </p>

          <h2 className="text-lg font-bold text-gray-900 pt-4">5. Contato</h2>
          <p>
            Para dúvidas sobre seus dados ou como funciona nossa integração com a API da Meta, entre em contato através do nosso suporte.
          </p>
        </section>

        <div className="pt-8 border-t text-center text-xs text-gray-400">
          Última atualização: Janeiro de 2026
        </div>
      </div>
    </div>
  );
}
