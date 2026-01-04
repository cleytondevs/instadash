import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Termos de Serviço</h1>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
        </div>

        <section className="space-y-4 text-gray-600 leading-relaxed">
          <h2 className="text-lg font-bold text-gray-900 pt-4">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar o InstaDash, você concorda em cumprir estes termos de serviço e todas as leis aplicáveis. Se você não concordar com algum destes termos, está proibido de usar este aplicativo.
          </p>

          <h2 className="text-lg font-bold text-gray-900 pt-4">2. Uso da Licença</h2>
          <p>
            O InstaDash é fornecido "como está". Não oferecemos garantias de qualquer tipo, expressas ou implícitas. O uso dos dados importados da API da Meta é de inteira responsabilidade do usuário, devendo este seguir as políticas de uso da própria Meta.
          </p>

          <h2 className="text-lg font-bold text-gray-900 pt-4">3. Limitações</h2>
          <p>
            Em nenhum caso o InstaDash ou seus desenvolvedores serão responsáveis por quaisquer danos decorrentes do uso ou da incapacidade de usar os materiais no aplicativo, mesmo que tenhamos sido notificados da possibilidade de tais danos.
          </p>

          <h2 className="text-lg font-bold text-gray-900 pt-4">4. Vínculo com a Meta</h2>
          <p>
            Este aplicativo é uma ferramenta de terceiros e não possui qualquer vínculo oficial ou endosso da Meta Platforms, Inc. A conexão é realizada através de ferramentas de desenvolvedor padrão fornecidas pela plataforma de origem dos dados.
          </p>

          <h2 className="text-lg font-bold text-gray-900 pt-4">5. Modificações</h2>
          <p>
            Podemos revisar estes termos de serviço a qualquer momento, sem aviso prévio. Ao usar este aplicativo, você concorda em ficar vinculado à versão atual desses termos de serviço.
          </p>
        </section>

        <div className="pt-8 border-t text-center text-xs text-gray-400">
          Última atualização: Janeiro de 2026
        </div>
      </div>
    </div>
  );
}
