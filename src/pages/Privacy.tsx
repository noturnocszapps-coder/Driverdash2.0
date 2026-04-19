import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, Lock, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Privacy = () => {
  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-emerald-500/30 selection:text-emerald-400">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-emerald-500 transition-colors font-black text-xs uppercase tracking-[0.2em] mb-12 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar ao Início
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <header className="space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4">
              <Lock size={32} />
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">Política de Privacidade</h1>
            <p className="text-zinc-500 font-medium">Conformidade LGPD e Proteção de Dados Financeiros</p>
          </header>

          <article className="prose prose-invert max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="text-emerald-500">01.</span> Coleta de Dados
              </h2>
              <p className="leading-relaxed">
                Coletamos informações essenciais para o funcionamento da plataforma: dados de identificação (nome, e-mail) e dados de operação financeira (ganhos brutos, taxas de aplicativos e quilometragem). De acordo com a LGPD, garantimos que o tratamento destes dados é limitado à finalidade de controle financeiro pessoal.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="text-emerald-500">02.</span> Segurança Financeira
              </h2>
              <p className="leading-relaxed">
                Seus dados financeiros são tratados com o mais alto nível de sigilo. Utilizamos criptografia de ponta a ponta e armazenamento em nuvem seguro para garantir que suas informações de lucro e despesas nunca sejam expostas a terceiros não autorizados.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="text-emerald-500">03.</span> Uso dos Dados
              </h2>
              <p className="leading-relaxed">
                O DriverDash NÃO vende ou compartilha seus dados pessoais ou financeiros com fins publicitários. Os dados são usados apenas para:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-400">
                <li>Cálculo de lucro líquido e métricas de performance;</li>
                <li>Geração de relatórios PDF e visualizações gráficas;</li>
                <li>Melhoria da experiência do usuário e suporte técnico;</li>
                <li>Cumprimento de obrigações legais vinculadas à NT APLICAÇÕES.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="text-emerald-500">04.</span> Seus Direitos (LGPD)
              </h2>
              <p className="leading-relaxed">
                Você tem o direito de solicitar o acesso, retificação ou exclusão definitiva de seus dados a qualquer momento através das configurações da plataforma ou por nosso e-mail de suporte.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="text-emerald-500">05.</span> Cookies e Rastreamento
              </h2>
              <p className="leading-relaxed">
                Utilizamos cookies técnicos apenas para manter sua sessão ativa e garantir a funcionalidade do PWA no seu dispositivo.
              </p>
            </section>
          </article>

          <div className="pt-12 border-t border-zinc-800 flex flex-col items-center gap-6">
            <Database size={48} className="text-emerald-500/20" />
            <p className="text-zinc-600 text-xs font-black uppercase tracking-[0.3em] text-center">
              Secured under LGPD Brazilian Law Compliance
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
