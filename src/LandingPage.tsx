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
  Cpu,
  Split,
  Brain,
  Map,
  ShieldCheck,
  RefreshCw,
  Gauge,
  Target
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './components/UI';
import { useDriverStore } from './store';

const ValueCard = ({ icon: Icon, title, subtitle, description }: any) => (
  <div className="p-8 rounded-[2rem] bg-zinc-900/50 border border-white/5 hover:border-emerald-500/20 transition-all group">
    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-zinc-400 group-hover:text-emerald-500 transition-colors">
      <Icon size={20} />
    </div>
    <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">{subtitle}</h4>
    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-3">{title}</h3>
    <p className="text-xs text-zinc-500 leading-relaxed font-medium">{description}</p>
  </div>
);

const StepCard = ({ number, icon: Icon, title, description }: any) => (
  <div className="relative z-10 flex flex-col items-center text-center space-y-6 group">
    <div className="relative">
      <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center text-white group-hover:border-emerald-500/50 transition-all duration-500">
        <Icon size={32} />
      </div>
      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black font-black text-[10px]">
        {number}
      </div>
    </div>
    <div className="space-y-2">
      <h4 className="text-lg font-black text-white uppercase tracking-tight">{title}</h4>
      <p className="text-sm text-zinc-500 leading-relaxed font-medium max-w-[200px] mx-auto">{description}</p>
    </div>
  </div>
);

const BenefitItem = ({ icon: Icon, title, description }: any) => (
  <div className="flex flex-col items-center text-center space-y-6">
    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
      <Icon size={18} />
    </div>
    <div className="space-y-2">
      <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">{title}</h4>
      <p className="text-xs text-zinc-500 leading-relaxed font-medium max-w-[200px]">{description}</p>
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

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-400 overflow-x-hidden font-sans">
      {/* Grid Background Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/50 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform font-black text-black">
              D
            </div>
            <span className="text-xl font-bold tracking-tighter">DriverDash Beta</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Funcionalidades</a>
            <a href="#preview" className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Painel</a>
            <a href="#benefits" className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Benefícios</a>
          </nav>

          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Link to="/login" className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors px-4 py-2">
                  Entrar
                </Link>
                <Link to="/register">
                  <Button className="hidden sm:flex h-9 px-4 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-black hover:bg-zinc-200 border-none rounded-full">
                    Começar
                  </Button>
                </Link>
              </>
            ) : (
              <Button 
                onClick={() => navigate('/dashboard')}
                className="h-9 px-4 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-black hover:bg-zinc-200 border-none rounded-full"
              >
                Painel
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-56 lg:pb-40 px-4">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[140px] rounded-full"></div>
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              O parceiro inteligente do motorista
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.85] mb-10 text-white">
              Controle total. <br />
              <span className="text-emerald-500">Lucro real.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-zinc-300 mb-4 max-w-3xl mx-auto leading-tight font-bold tracking-tight">
              Pare de rodar no escuro. Descubra quanto você realmente ganha por KM e tome decisões com base em dados reais.
            </p>
            <p className="text-sm md:text-base text-emerald-500/80 mb-10 font-black uppercase tracking-[0.2em]">
              Feito para motoristas de Uber e 99 que querem entender o lucro de verdade.
            </p>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12">
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Navigation size={16} />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Precisão</div>
                  <div className="text-xs font-bold text-white uppercase tracking-tight">Rastreamento Real</div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <RefreshCw size={16} />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Frequência</div>
                  <div className="text-xs font-bold text-white uppercase tracking-tight">Lucro por Ciclo</div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                  <ShieldCheck size={16} />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Confiança</div>
                  <div className="text-xs font-bold text-white uppercase tracking-tight">Sem Estimativas</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 mb-14">
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  <CheckCircle2 size={14} />
                  Rastreamento automático de KM
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  <CheckCircle2 size={14} />
                  Cálculo real de lucro por ciclo
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  <CheckCircle2 size={14} />
                  Inteligência de performance
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register" className="w-full sm:w-auto">
                <Button className="h-14 px-12 text-sm font-black uppercase tracking-[0.2em] w-full bg-white text-black hover:bg-zinc-200 shadow-2xl shadow-white/10 rounded-full group">
                  Criar Conta
                  <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#how-it-works" className="w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  className="h-14 px-12 text-sm font-black uppercase tracking-[0.2em] w-full border-white/10 hover:bg-white/5 text-white rounded-full"
                >
                  Ver como funciona
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proof Section */}
      <section className="py-32 relative border-t border-white/5 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-20">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500 mb-6">Por que DriverDash?</h2>
            <p className="text-4xl md:text-6xl font-black tracking-tighter text-white max-w-3xl mx-auto leading-[0.9]">O controle que as plataformas não te dão.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            <ValueCard 
              icon={Gauge}
              title="KM Real"
              subtitle="Sem chute ou estimativa"
              description="Rastreamento preciso via GPS que separa o que é trabalho do que é deslocamento."
            />
            <ValueCard 
              icon={DollarSign}
              title="Lucro Líquido"
              subtitle="Automático e real"
              description="Dedução automática de combustível, taxas e custos fixos em cada turno."
            />
            <ValueCard 
              icon={RefreshCw}
              title="Ciclos 24h"
              subtitle="Controle total do dia"
              description="Abra e feche seu dia de trabalho e veja exatamente quanto sobrou no bolso."
            />
            <ValueCard 
              icon={ShieldCheck}
              title="Dados Confiáveis"
              subtitle="Sem estimativa fake"
              description="Informações baseadas no seu trajeto real, não em médias genéricas do mercado."
            />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-32 relative bg-black border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-24">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500 mb-6">O Caminho do Lucro</h2>
            <p className="text-4xl md:text-6xl font-black tracking-tighter text-white">Simples. Direto. Eficiente.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-12 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-emerald-500/10 -translate-y-1/2 z-0"></div>
            
            <StepCard 
              number="01"
              icon={Navigation}
              title="Ative o rastreamento"
              description="Inicie seu turno com um toque antes de sair de casa."
            />
            <StepCard 
              number="02"
              icon={Car}
              title="Rode normalmente"
              description="Trabalhe na Uber ou 99 enquanto o app monitora cada KM rodado."
            />
            <StepCard 
              number="03"
              icon={Square}
              title="Feche o ciclo"
              description="No fim do dia, encerre o turno e lance seus ganhos brutos."
            />
            <StepCard 
              number="04"
              icon={BarChart3}
              title="Descubra seu lucro"
              description="Veja seu lucro real, descontando custos, e entenda sua eficiência."
            />
          </div>
        </div>
      </section>

      {/* Differential Section */}
      <section className="py-32 relative bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            <div className="flex-1 space-y-8">
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500">Diferencial</h2>
              <p className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-[0.9]">Não é apenas um app de anotação.</p>
              <p className="text-xl text-zinc-400 leading-relaxed">
                O DriverDash é uma ferramenta de inteligência. Enquanto outros apps pedem que você chute dados, nós rastreamos a realidade das ruas para você.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-8 pt-4">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Split size={20} />
                  </div>
                  <h4 className="font-black text-white uppercase tracking-tight">KM Produtivo vs Ocioso</h4>
                  <p className="text-sm text-zinc-500">Saiba exatamente quanto você rodou com passageiro e quanto rodou vazio "pagando para trabalhar".</p>
                </div>
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <TrendingUp size={20} />
                  </div>
                  <h4 className="font-black text-white uppercase tracking-tight">Lucro Real, Não Bruto</h4>
                  <p className="text-sm text-zinc-500">Faturamento é vaidade, lucro é realidade. Mostramos o que sobra após combustível e custos.</p>
                </div>
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Brain size={20} />
                  </div>
                  <h4 className="font-black text-white uppercase tracking-tight">Decisões com Dados</h4>
                  <p className="text-sm text-zinc-500">Use seu histórico real para entender se aquela região ou horário realmente compensa.</p>
                </div>
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Target size={20} />
                  </div>
                  <h4 className="font-black text-white uppercase tracking-tight">Vale a pena rodar?</h4>
                  <p className="text-sm text-zinc-500">Tenha a resposta definitiva sobre sua rentabilidade diária, semanal e mensal.</p>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full">
              <div className="relative aspect-square max-w-md mx-auto">
                <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full animate-pulse"></div>
                <div className="relative z-10 w-full h-full bg-zinc-900 rounded-[3rem] border border-white/10 p-8 flex flex-col justify-between shadow-2xl">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Eficiência Hoje</div>
                      <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">Excelente</div>
                    </div>
                    <div className="text-6xl font-black text-white">84%</div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[84%]"></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Lucro p/ KM</div>
                        <div className="text-lg font-black text-white">R$ 2,45</div>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                        <Map size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">KM Ocioso</div>
                        <div className="text-lg font-black text-white">12.4 km</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intelligence Section */}
      <section className="py-32 relative bg-black overflow-hidden border-t border-white/5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500 mb-6">Inteligência de Dados</h2>
            <p className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-8">Dirija com inteligência.</p>
            <p className="text-xl text-zinc-400 leading-relaxed">
              O DriverDash usa seus próprios dados para identificar padrões de ganho, horários mais fortes e regiões com mais potencial.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Clock size={24} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Padrões de Ganho</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Identificamos em quais janelas de tempo sua rentabilidade por KM é maior, baseada no seu histórico real.</p>
            </div>
            <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Map size={24} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Eficiência Geográfica</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Mapeamos onde você costuma ter as melhores corridas e onde o KM ocioso está matando seu lucro.</p>
            </div>
            <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Metas de Verdade</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Projeções honestas baseadas na sua performance média, para você saber exatamente quanto falta para o seu objetivo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* App Previews / Mocks */}
      <section className="py-32 px-4 relative border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500 mb-6">Interface</h2>
            <p className="text-4xl md:text-6xl font-black tracking-tighter text-white">Tudo o que você precisa.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-6">
              <div className="aspect-[9/16] bg-zinc-900 rounded-[2.5rem] border border-white/10 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10"></div>
                <div className="absolute bottom-8 left-8 right-8 z-20">
                  <h4 className="text-lg font-black text-white uppercase tracking-tight mb-2">Dashboard</h4>
                  <p className="text-xs text-zinc-400">Visão geral em tempo real do seu turno.</p>
                </div>
                {/* Mock UI */}
                <div className="p-6 space-y-6 opacity-50 group-hover:opacity-100 transition-opacity">
                  <div className="h-20 bg-emerald-500/20 rounded-2xl border border-emerald-500/30"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-white/5 rounded-2xl border border-white/10"></div>
                    <div className="h-24 bg-white/5 rounded-2xl border border-white/10"></div>
                  </div>
                  <div className="h-40 bg-white/5 rounded-2xl border border-white/10"></div>
                </div>
              </div>
            </div>
            <div className="space-y-6 md:translate-y-12">
              <div className="aspect-[9/16] bg-zinc-900 rounded-[2.5rem] border border-white/10 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10"></div>
                <div className="absolute bottom-8 left-8 right-8 z-20">
                  <h4 className="text-lg font-black text-white uppercase tracking-tight mb-2">Relatórios</h4>
                  <p className="text-xs text-zinc-400">Análise profunda de ganhos e gastos.</p>
                </div>
                {/* Mock UI */}
                <div className="p-6 space-y-6 opacity-50 group-hover:opacity-100 transition-opacity">
                  <div className="h-32 bg-blue-500/20 rounded-2xl border border-blue-500/30"></div>
                  <div className="space-y-3">
                    <div className="h-12 bg-white/5 rounded-xl border border-white/10"></div>
                    <div className="h-12 bg-white/5 rounded-xl border border-white/10"></div>
                    <div className="h-12 bg-white/5 rounded-xl border border-white/10"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="aspect-[9/16] bg-zinc-900 rounded-[2.5rem] border border-white/10 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10"></div>
                <div className="absolute bottom-8 left-8 right-8 z-20">
                  <h4 className="text-lg font-black text-white uppercase tracking-tight mb-2">Heatmap</h4>
                  <p className="text-xs text-zinc-400">Inteligência geográfica de lucro.</p>
                </div>
                {/* Mock UI */}
                <div className="p-6 space-y-6 opacity-50 group-hover:opacity-100 transition-opacity">
                  <div className="absolute inset-0 bg-emerald-500/5 flex items-center justify-center">
                    <Map size={100} className="text-emerald-500/20" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/40 blur-xl absolute top-20 left-20"></div>
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 blur-2xl absolute top-40 left-40"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section id="preview" className="py-32 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 space-y-10">
              <div className="inline-block p-3 bg-white/5 border border-white/10 rounded-2xl">
                <PieChart size={24} className="text-white" />
              </div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] text-white">
                Seu painel de <br />
                <span className="text-emerald-500">comando.</span>
              </h2>
              <p className="text-xl text-zinc-400 leading-relaxed font-medium">
                Uma interface limpa que coloca o que importa na frente. Visualize seu lucro líquido, metas e histórico sem ruído visual.
              </p>
              
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="text-sm font-bold text-zinc-300">Análise de lucro por hora</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="text-sm font-bold text-zinc-300">Projeção de metas mensais</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="text-sm font-bold text-zinc-300">Histórico completo de manutenção</span>
                </div>
              </div>

              <div className="pt-8">
                <Button 
                  onClick={handleAccessPanel}
                  className="h-12 px-8 bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-[10px] rounded-full"
                >
                  Explorar Painel <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>

            <div className="flex-1 relative">
              {/* Simulated Dashboard UI - Minimalist Version */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 bg-zinc-900/50 rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-sm"
              >
                <div className="h-14 border-b border-white/5 bg-black/40 flex items-center px-8 justify-between">
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Dashboard Preview</div>
                </div>
                <div className="p-10 space-y-10">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Lucro Hoje</div>
                      <div className="text-4xl font-black text-white">R$ 284,00</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Km Rodados</div>
                      <div className="text-4xl font-black text-white">142.5</div>
                    </div>
                  </div>
                  
                  <div className="h-40 flex items-end gap-3">
                    {[30, 60, 40, 80, 50, 90, 70].map((h, i) => (
                      <div key={i} className="flex-1 bg-white/5 border border-white/10 rounded-xl transition-all hover:bg-emerald-500/20 hover:border-emerald-500/30" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="h-14 bg-white/5 rounded-2xl border border-white/10 flex items-center px-6 justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black font-black text-xs">U</div>
                        <span className="text-sm font-bold text-white">Uber X • 15:30</span>
                      </div>
                      <span className="text-sm font-black text-emerald-500">+ R$ 24,50</span>
                    </div>
                    <div className="h-14 bg-white/5 rounded-2xl border border-white/10 flex items-center px-6 justify-between opacity-40">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg"></div>
                        <div className="w-24 h-2 bg-zinc-800 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Decorative Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-16">
            <BenefitItem 
              icon={Smartphone}
              title="Mobile Friendly"
              description="Interface otimizada para o uso rápido entre uma corrida e outra."
            />
            <BenefitItem 
              icon={Cloud}
              title="Cloud Sync"
              description="Seus dados salvos e sincronizados em tempo real com a nuvem."
            />
            <BenefitItem 
              icon={Lock}
              title="Secure Data"
              description="Privacidade total. Seus dados financeiros pertencem apenas a você."
            />
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-40 px-4 relative overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 bg-emerald-500/5 blur-[150px] rounded-full -translate-y-1/2"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.85]">
              Use dados reais para <br />
              <span className="text-emerald-500">dirigir com inteligência.</span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-xl mx-auto font-medium">
              Pare de chutar seus ganhos. Comece hoje a acompanhar seu lucro real com o DriverDash.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/register" className="w-full sm:w-auto">
                <Button className="h-16 px-14 text-sm font-black uppercase tracking-[0.2em] w-full bg-white text-black hover:bg-zinc-200 rounded-full shadow-2xl shadow-white/10">
                  Criar Conta Grátis
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="outline" className="h-16 px-14 text-sm font-black uppercase tracking-[0.2em] w-full border-white/10 hover:bg-white/5 text-white rounded-full">
                  Entrar
                </Button>
              </Link>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">
              Sem custos ocultos • Sem cartão de crédito
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-white rounded flex items-center justify-center font-black text-[10px] text-black">
                D
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8">
              <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Login</Link>
              <Link to="/register" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Register</Link>
              <a href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Privacy</a>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
              © 2026 DriverDash.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
