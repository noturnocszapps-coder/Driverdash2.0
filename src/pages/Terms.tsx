import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, FileText, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Terms = () => {
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
              <Scale size={32} />
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">Termos de Uso</h1>
            <p className="text-zinc-500 font-medium">Última atualização: Abril de 2026</p>
          </header>

          <article className="prose prose-invert max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="text-emerald-500">01.</span> Aceitação dos Termos
              </h2>
              <p className="leading-relaxed">
                Ao acessar e utilizar o DriverDash, você concorda em cumprir e estar vinculado a estes Termos de Uso. Esta plataforma é destinada a motoristas profissionais que buscam gerenciar suas finanças e performance.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="text-emerald-500">02.</span> Natureza dos Dados
              </h2>
              <p className="leading-relaxed">
                O DriverDash processa dados financeiros (ganhos, despesas, km rodados) fornecidos pelo usuário ou importados via relatórios de plataformas de terceiros. Esses dados são utilizados exclusivamente para o cálculo de métricas de lucro, performance e geração de relatórios para o próprio usuário.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="text-emerald-500">03.</span> Responsabilidade do Usuário
              </h2>
              <p className="leading-relaxed">
                O usuário é o único responsável pela veracidade dos dados inseridos e pela segurança de suas credenciais de acesso. O DriverDash não se responsabiliza por decisões financeiras tomadas com base nas métricas apresentadas, sendo estas ferramentas de apoio e não aconselhamento financeiro profissional.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="text-emerald-500">04.</span> Propriedade Intelectual
              </h2>
              <p className="leading-relaxed">
                Todo o conteúdo, design e tecnologia do DriverDash são de propriedade exclusiva da NT APLICAÇÕES. É proibida a reprodução total ou parcial sem autorização prévia por escrito.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="text-emerald-500">05.</span> Alterações nos Termos
              </h2>
              <p className="leading-relaxed">
                Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão notificadas através da plataforma ou e-mail cadastrado.
              </p>
            </section>
          </article>

          <div className="pt-12 border-t border-zinc-800 flex flex-col items-center gap-6">
            <ShieldCheck size={48} className="text-emerald-500/20" />
            <p className="text-zinc-600 text-xs font-black uppercase tracking-[0.3em] text-center">
              DriverDash Legal Compliance Section
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
