import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Exclusão de Dados</h1>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
        </div>

        <section className="space-y-6 text-gray-600 leading-relaxed">
          <p>
            Em conformidade com as políticas da Meta Platforms, Inc., fornecemos este guia para que você possa solicitar a exclusão de seus dados associados ao InstaDash.
          </p>

          <h2 className="text-lg font-bold text-gray-900">Como excluir seus dados:</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <p>Acesse as <strong>Configurações e Privacidade</strong> da sua conta do Facebook.</p>
            </div>
            
            <div className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <p>Clique em <strong>Aplicativos e Sites</strong> e procure por <strong>InstaDash</strong>.</p>
            </div>
            
            <div className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <p>Clique no botão <strong>Remover</strong> ao lado do nome do aplicativo.</p>
            </div>

            <div className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
              <p>Marque a opção <strong>"Permitir que o InstaDash exclua todas as suas informações de publicações, fotos e vídeos que foram publicadas no Facebook em seu nome"</strong> se desejar uma limpeza completa.</p>
            </div>
          </div>

          <h2 className="text-lg font-bold text-gray-900 pt-4">Solicitação via Suporte</h2>
          <p>
            Se você deseja que apaguemos manualmente qualquer registro de uso ou cache do nosso banco de dados, você pode enviar um e-mail para o nosso suporte com o assunto "Exclusão de Dados Meta" informando seu User ID.
          </p>

          <div id="deletion-status" className="hidden p-4 bg-green-50 border border-green-100 rounded-xl text-green-800 text-sm font-medium">
            Sua solicitação de exclusão foi processada. Código: <span id="confirmation-code"></span>
          </div>

          <script dangerouslySetInnerHTML={{ __html: `
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('id');
            if (id) {
              document.getElementById('deletion-status').classList.remove('hidden');
              document.getElementById('confirmation-code').innerText = id;
            }
          `}} />

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm italic">
            Nota: O InstaDash não armazena seus dados de anúncios de forma permanente. Os dados são consultados em tempo real e qualquer cache local é removido automaticamente quando você desconecta sua conta.
          </div>
        </section>

        <div className="pt-8 border-t text-center text-xs text-gray-400">
          Última atualização: Janeiro de 2026
        </div>
      </div>
    </div>
  );
}
