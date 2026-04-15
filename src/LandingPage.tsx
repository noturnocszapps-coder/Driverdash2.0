import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Car, 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  Clock, 
  Smartphone, 
  BarChart3, 
  Zap, 
  Cloud, 
  Lock,
  CheckCircle2,
  ChevronRight,
  PieChart,
  DollarSign,
  Activity,
  LayoutDashboard,
  Receipt,
  FileText,
  Navigation,
  Square,
  Split,
  Map,
  ShieldCheck,
  RefreshCw,
  Gauge,
  Target,
  Mic,
  MousePointer2,
  ZapOff,
  BarChart4
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './components/UI';
import { useDriverStore } from './store';
import { cn } from './utils';

const ValueCard = ({ icon: Icon, title, subtitle, description }: any) => (
  <motion.div 
    whileHover={{ scale: 1.02, y: -5 }}
    className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-white/5 hover:border-emerald-500/30 transition-all group relative overflow-hidden backdrop-blur-md"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative z-10">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 text-zinc-400 group-hover:text-emerald-400 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all">
        <Icon size={24} />
      </div>
      <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2">{subtitle}</h4>
      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed font-medium">{description}</p>
    </div>
  </motion.div>
);

const StepCard = ({ number, icon: Icon, title, description }: any) => (
  <div className="relative z-10 flex flex-col items-center text-center space-y-6 group">
    <div className="relative">
      <motion.div 
        whileHover={{ rotate: 5, scale: 1.05 }}
        className="w-24 h-24 rounded-[2rem] bg-zinc-900 border border-white/10 flex items-center justify-center text-white group-hover:border-emerald-500/50 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-500"
      >
        <Icon size={36} />
      </motion.div>
      <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-black font-black text-xs shadow-lg shadow-emerald-500/20">
        {number}
      </div>
    </div>
    <div className="space-y-2">
      <h4 className="text-xl font-black text-white uppercase tracking-tight">{title}</h4>
      <p className="text-sm text-zinc-500 leading-relaxed font-medium max-w-[220px] mx-auto">{description}</p>
    </div>
  </div>
);

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useDriverStore();

  const handleAccessPanel = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  } as any;

  return (
    <div className="min-h-[100dvh] bg-black text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-400 overflow-x-hidden font-sans">
      {/* Premium Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full opacity-20">
          <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[60%] bg-emerald-500/20 blur-[160px] rounded-full animate-pulse" />
          <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[140px] rounded-full" />
        </div>
        <div className="absolute inset-0 opacity-[0.02]" 
             style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/40 backdrop-blur-2xl border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all font-black text-black shadow-xl shadow-white/5">
              D
            </div>
            <span className="text-2xl font-black tracking-tighter">DriverDash</span>
          </div>
          
          <nav className="hidden lg:flex items-center gap-10">
            {['Funcionalidades', 'Painel', 'Benefícios'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-emerald-500 transition-all group-hover:w-full" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {!user ? (
              <>
                <Link to="/login" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors px-4 py-2">
                  Entrar
                </Link>
                <Link to="/register">
                  <Button className="h-11 px-6 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-black hover:bg-zinc-200 border-none rounded-full shadow-lg shadow-white/5">
                    Começar
                  </Button>
                </Link>
              </>
            ) : (
              <Button 
                onClick={() => navigate('/dashboard')}
                className="h-11 px-6 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-black hover:bg-zinc-200 border-none rounded-full"
              >
                Painel
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 lg:pt-64 lg:pb-48 px-6">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto text-center relative z-10"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-12 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            O parceiro definitivo do motorista profissional
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl lg:text-[10rem] font-black tracking-tighter leading-[0.8] mb-12 text-white">
            Controle total. <br />
            <span className="text-emerald-500 drop-shadow-[0_0_40px_rgba(16,185,129,0.3)]">Lucro real.</span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-2xl md:text-3xl text-zinc-300 mb-6 max-w-3xl mx-auto leading-tight font-bold tracking-tight">
            Descubra quanto você realmente ganha por KM em tempo real.
          </motion.p>
          
          <motion.p variants={itemVariants} className="text-sm md:text-base text-zinc-500 mb-16 font-black uppercase tracking-[0.2em] max-w-2xl mx-auto">
            Pare de rodar no escuro. O DriverDash transforma seus dados de GPS em lucro líquido e decisões estratégicas.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-24">
            <Link to="/register" className="w-full sm:w-auto">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button className="h-16 px-14 text-sm font-black uppercase tracking-[0.2em] w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.25)] rounded-full group border-none">
                  COMEÇAR AGORA
                  <ArrowRight size={20} className="ml-3 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button 
                variant="outline" 
                className="h-16 px-14 text-sm font-black uppercase tracking-[0.2em] w-full border-white/10 hover:bg-white/5 text-white rounded-full backdrop-blur-md"
              >
                VER COMO FUNCIONA
              </Button>
            </a>
          </motion.div>

          {/* Quick Stats / Immediate Proof */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {[
              { label: 'Corridas Analisadas', value: '+1.000', icon: BarChart4 },
              { label: 'Precisão de Dados', value: 'GPS REAL', icon: Navigation },
              { label: 'Plataformas Suportadas', value: 'UBER & 99', icon: Car },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-4 px-8 py-6 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-xl">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <stat.icon size={20} />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">{stat.label}</div>
                  <div className="text-lg font-black text-white uppercase tracking-tight">{stat.value}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Aggressive Differential Section */}
      <section className="py-40 relative border-t border-white/5 bg-zinc-950/30 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-emerald-500/5 blur-[160px] rounded-full" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white mb-8 leading-[0.9]"
            >
              Você está dirigindo sem saber quanto <span className="text-emerald-500">ganha de verdade.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-zinc-400 font-medium leading-relaxed"
            >
              As plataformas mostram faturamento. O DriverDash mostra lucro real. <br className="hidden md:block" />
              Pare de pagar para trabalhar e comece a gerir seu negócio como um profissional.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Refined Cards Section */}
      <section id="funcionalidades" className="py-40 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ValueCard 
              icon={Gauge}
              title="KM Real"
              subtitle="Precisão Absoluta"
              description="Rastreamento via GPS que separa automaticamente o que é trabalho do que é deslocamento ocioso."
            />
            <ValueCard 
              icon={DollarSign}
              title="Lucro Líquido"
              subtitle="Cálculo Automático"
              description="Dedução instantânea de combustível, taxas e custos fixos. Saiba exatamente o que sobra no bolso."
            />
            <ValueCard 
              icon={RefreshCw}
              title="Ciclos 24h"
              subtitle="Gestão Diária"
              description="Abra e feche seu dia de trabalho com um toque. Controle total da sua jornada e rentabilidade."
            />
            <ValueCard 
              icon={ShieldCheck}
              title="Dados Reais"
              subtitle="Sem Estimativas"
              description="Informações baseadas no seu trajeto real, não em médias genéricas que não refletem sua realidade."
            />
          </div>
        </div>
      </section>

      {/* Voice Assistant Section - NEW */}
      <section className="py-40 relative border-y border-white/5 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-emerald-500/[0.02] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 space-y-10">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 relative"
              >
                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                <Mic size={40} className="relative z-10" />
              </motion.div>
              <div className="space-y-6">
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.9]">
                  Dirija sem tocar <br />
                  <span className="text-emerald-500">no celular.</span>
                </h2>
                <p className="text-xl text-zinc-400 leading-relaxed font-medium max-w-xl">
                  Controle suas corridas, registre eventos e calcule ganhos apenas com a sua voz. Segurança total enquanto você foca no que importa: a estrada.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                {['"Iniciar corrida"', '"Valor da corrida"', '"Polícia no mapa"'].map((cmd, i) => (
                  <div key={i} className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-zinc-300 uppercase tracking-widest italic">
                    {cmd}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full flex justify-center">
              <div className="relative w-full max-w-md aspect-square">
                <div className="absolute inset-0 bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
                <motion.div 
                  animate={{ 
                    scale: [1, 1.05, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute inset-0 border-2 border-emerald-500/20 rounded-full"
                />
                <motion.div 
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.2, 0.4, 0.2]
                  }}
                  transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                  className="absolute inset-0 border-2 border-emerald-500/10 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full bg-zinc-900 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.15)]">
                    <div className="flex gap-1.5 items-end h-12">
                      {[0.4, 0.8, 0.5, 0.9, 0.6, 0.3, 0.7].map((h, i) => (
                        <motion.div 
                          key={i}
                          animate={{ height: [`${h * 40}%`, `${(1-h) * 100}%`, `${h * 40}%`] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                          className="w-2 bg-emerald-500 rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-40 relative bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-32">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500 mb-6">O Caminho do Lucro</h2>
            <p className="text-5xl md:text-7xl font-black tracking-tighter text-white">Simples. Direto. Profissional.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-16 relative">
            <div className="hidden md:block absolute top-12 left-0 w-full h-px bg-emerald-500/10 z-0" />
            
            <StepCard 
              number="01"
              icon={Navigation}
              title="Ative o GPS"
              description="Inicie seu turno com um toque. O app começa a monitorar seu trajeto."
            />
            <StepCard 
              number="02"
              icon={Car}
              title="Rode e Lucre"
              description="Trabalhe normalmente. O DriverDash separa cada KM produtivo."
            />
            <StepCard 
              number="03"
              icon={Square}
              title="Feche o Ciclo"
              description="No fim do dia, encerre o turno e registre seus ganhos brutos."
            />
            <StepCard 
              number="04"
              icon={BarChart3}
              title="Veja a Realidade"
              description="Descubra seu lucro real, descontando todos os custos operacionais."
            />
          </div>
        </div>
      </section>

      {/* Urgency / Conversion Section */}
      <section className="py-32 relative overflow-hidden bg-zinc-950 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white">
              Teste grátis por 7 dias.
            </h2>
            <p className="text-xl text-zinc-400 font-medium">
              Cancele quando quiser. Sem letras miúdas, apenas lucro real.
            </p>
            <div className="pt-4">
              <Link to="/register">
                <Button className="h-16 px-14 text-sm font-black uppercase tracking-[0.2em] bg-emerald-500 text-zinc-950 hover:bg-emerald-400 rounded-full shadow-2xl shadow-emerald-500/20">
                  EXPERIMENTAR AGORA
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-48 px-6 relative overflow-hidden bg-black">
        <div className="absolute inset-0 bg-emerald-500/5 blur-[180px] rounded-full -translate-y-1/2" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-16"
          >
            <h2 className="text-6xl md:text-9xl font-black tracking-tighter text-white leading-[0.8]">
              Comece hoje e descubra quanto você <br />
              <span className="text-emerald-500">realmente lucra.</span>
            </h2>
            <p className="text-2xl text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
              Pare de chutar seus ganhos. Transforme seu celular em um copiloto de alta performance.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/register" className="w-full sm:w-auto">
                <Button className="h-20 px-16 text-base font-black uppercase tracking-[0.2em] w-full bg-white text-black hover:bg-zinc-200 rounded-full shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-all hover:scale-105">
                  COMEÇAR AGORA
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="outline" className="h-20 px-16 text-base font-black uppercase tracking-[0.2em] w-full border-white/10 hover:bg-white/5 text-white rounded-full">
                  ENTRAR
                </Button>
              </Link>
            </div>
            <div className="flex flex-col items-center gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600">
                Sem custos ocultos • Sem cartão de crédito
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-16">
            <div className="flex flex-col items-center md:items-start gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-xs text-black">
                  D
                </div>
                <span className="text-xl font-black tracking-tighter">DriverDash</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                A ferramenta definitiva para o motorista de elite.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-12">
              {['Login', 'Register', 'Privacy', 'Terms'].map(link => (
                <Link key={link} to={link === 'Login' ? '/login' : link === 'Register' ? '/register' : '#'} className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white transition-colors">
                  {link}
                </Link>
              ))}
            </div>

            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
              © 2026 DriverDash. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
