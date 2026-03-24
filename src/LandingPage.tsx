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
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './components/UI';
import { useDriverStore } from './store';

export const LandingPage = () => {
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
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              O parceiro inteligente do motorista
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.85] mb-10 text-white">
              Controle total. <br />
              <span className="text-emerald-500">Lucro real.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-400 mb-14 max-w-2xl mx-auto leading-relaxed font-medium">
              A ferramenta definitiva para motoristas de Uber e 99. 
              Gerencie seus ganhos brutos, deduza despesas e saiba seu lucro líquido real por ciclo de 24h.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register" className="w-full sm:w-auto">
                <Button className="h-14 px-12 text-sm font-black uppercase tracking-[0.2em] w-full bg-white text-black hover:bg-zinc-200 shadow-2xl shadow-white/10 rounded-full group">
                  Criar Conta
                  <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="h-14 px-12 text-sm font-black uppercase tracking-[0.2em] w-full sm:w-auto border-white/10 hover:bg-white/5 text-white rounded-full"
                onClick={handleAccessPanel}
              >
                Acessar Painel
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 relative border-y border-white/5 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-24">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500 mb-6">Funcionalidades</h2>
            <p className="text-4xl md:text-6xl font-black tracking-tighter text-white">Simplicidade em cada detalhe.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={LayoutDashboard}
              title="Ciclos de 24h"
              description="Controle sua jornada por ciclos. Inicie e feche turnos para ver seu desempenho exato."
            />
            <FeatureCard 
              icon={Receipt}
              title="Gestão de Custos"
              description="Diferencie custos fixos (aluguel/seguro) de despesas variáveis (combustível/comida)."
            />
            <FeatureCard 
              icon={Car}
              title="Perfil do Veículo"
              description="Cadastre seu carro e vincule todos os custos automaticamente ao seu faturamento."
            />
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
      <section className="py-40 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.85]">
              Pronto para <br />
              <span className="text-zinc-500">começar?</span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-xl mx-auto font-medium">
              Junte-se a milhares de motoristas que transformaram sua gestão financeira com o DriverDash.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/register" className="w-full sm:w-auto">
                <Button className="h-16 px-14 text-sm font-black uppercase tracking-[0.2em] w-full bg-white text-black hover:bg-zinc-200 rounded-full">
                  Criar Conta Grátis
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
};

const FeatureCard = ({ icon: Icon, title, description }: any) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-10 bg-white/[0.02] rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-all group"
    >
      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 text-white group-hover:bg-white group-hover:text-black transition-all duration-500">
        <Icon size={24} />
      </div>
      <h3 className="text-xl font-black mb-4 text-white uppercase tracking-tight">{title}</h3>
      <p className="text-zinc-500 leading-relaxed text-sm font-medium">{description}</p>
    </motion.div>
  );
};

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
