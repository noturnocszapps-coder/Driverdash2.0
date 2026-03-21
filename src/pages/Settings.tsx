import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDriverStore } from '../store';
import { Card, CardContent, Button, Input, Select } from '../components/UI';
import { 
  User, Car, Target, Trash2, LogOut, Download, Database, 
  Upload, RefreshCw, AlertCircle, 
  Zap, ChevronRight, Shield, History, Smartphone, Layout, Globe, ChevronDown,
  DollarSign, Plus, CheckCircle2
} from 'lucide-react';
import { downloadFile, formatCurrency, calculateDailyFixedCost, calculateMonthlyFixedCost } from '../utils';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { SyncIndicator } from '../components/SyncIndicator';
import { VehicleProfile } from '../types';

export const Settings = () => {
  const navigate = useNavigate();
  const { 
    settings, updateSettings, clearData, clearCloudData, 
    cycles, importData, user, setUser, syncStatus, syncData, isSaving 
  } = useDriverStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const currentVehicle = useMemo(() => {
    return settings.vehicleProfiles?.find(v => v.id === settings.currentVehicleProfileId);
  }, [settings.vehicleProfiles, settings.currentVehicleProfileId]);

  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSelectVehicle = (id: string) => {
    const selected = settings.vehicleProfiles?.find(v => v.id === id);
    if (!selected) return;

    updateSettings({
      currentVehicleProfileId: id,
      fixedCosts: selected.fixedCosts,
      transportMode: selected.category,
      vehicle: selected.name
    });
    setShowVehicleSelector(false);
  };

  const handleSaveVehicle = async () => {
    if (!currentVehicle) return;
    
    if (!currentVehicle.name.trim()) {
      alert('O nome do veículo não pode estar vazio.');
      return;
    }

    try {
      // Ensure all fields are persisted to the store and Supabase
      await updateSettings({
        vehicleProfiles: settings.vehicleProfiles,
        currentVehicleProfileId: settings.currentVehicleProfileId,
        vehicle: currentVehicle.name
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('[Settings] Error saving vehicle:', error);
      alert('Erro ao salvar veículo. Verifique sua conexão.');
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (settings.vehicleProfiles && settings.vehicleProfiles.length <= 1) {
      alert('Você precisa ter pelo menos um veículo cadastrado.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir este veículo?')) {
      const updated = settings.vehicleProfiles?.filter(v => v.id !== id);
      const nextVehicle = updated?.[0];
      
      try {
        await updateSettings({ 
          vehicleProfiles: updated,
          currentVehicleProfileId: nextVehicle?.id,
          fixedCosts: nextVehicle?.fixedCosts,
          transportMode: nextVehicle?.category,
          vehicle: nextVehicle?.name || ''
        });
      } catch (error) {
        alert('Erro ao excluir veículo. Verifique sua conexão.');
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  const handleAddVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newVehicle: VehicleProfile = {
      id: crypto.randomUUID(),
      name: formData.get('name') as string,
      brand: formData.get('brand') as string,
      model: formData.get('model') as string,
      year: formData.get('year') as string,
      plate: formData.get('plate') as string,
      type: formData.get('type') as any,
      category: formData.get('category') as any,
      fixedCosts: {
        vehicleType: formData.get('type') as any,
        rentalPeriod: 'weekly',
      },
      createdAt: new Date().toISOString()
    };

    try {
      await updateSettings({
        vehicleProfiles: [...(settings.vehicleProfiles || []), newVehicle],
        currentVehicleProfileId: newVehicle.id,
        fixedCosts: newVehicle.fixedCosts,
        transportMode: newVehicle.category,
        vehicle: newVehicle.name
      });
      setIsAddingVehicle(false);
    } catch (error) {
      alert('Erro ao adicionar veículo. Verifique sua conexão.');
    }
  };

  const updateCurrentVehicleCosts = async (newFixedCosts: any) => {
    if (!settings.currentVehicleProfileId) return;
    const updatedProfiles = settings.vehicleProfiles?.map(v => 
      v.id === settings.currentVehicleProfileId ? { ...v, fixedCosts: { ...v.fixedCosts, ...newFixedCosts } } : v
    );
    try {
      await updateSettings({ 
        vehicleProfiles: updatedProfiles,
        fixedCosts: { ...settings.fixedCosts, ...newFixedCosts }
      });
    } catch (error) {
      alert('Erro ao atualizar custos. Verifique sua conexão.');
    }
  };

  const handleClearData = async () => {
    setIsDeleting(true);
    try {
      if (user) {
        const result = await clearCloudData();
        if (!result.success) {
          alert('Erro ao apagar dados da nuvem. Verifique sua conexão e tente novamente.');
          setIsDeleting(false);
          return;
        }
      }
      clearData();
      setShowDeleteConfirm(false);
      alert('Todos os seus dados foram apagados com sucesso.');
    } catch (error) {
      console.error('[Settings] Error clearing data:', error);
      alert('Ocorreu um erro ao apagar os dados.');
    } finally {
      setIsDeleting(false);
    }
  };

  const exportBackup = () => {
    const data = { cycles, settings };
    downloadFile(JSON.stringify(data, null, 2), `driverdash-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.cycles || data.settings) {
          importData(data);
          alert('Backup importado com sucesso!');
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err) {
        alert('Erro ao ler o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('A foto deve ter no máximo 2MB.');
      return;
    }

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await updateSettings({ photoUrl: base64 });
      } catch (error) {
        console.error('Error uploading photo:', error);
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    if (confirm('Deseja remover sua foto de perfil?')) {
      await updateSettings({ photoUrl: undefined });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-24 md:pb-8"
    >
      <header className="px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Configurações</p>
        <h1 className="text-3xl font-black tracking-tighter">Ajustes</h1>
      </header>

      {/* Profile Section */}
      <section className="space-y-4">
        <SectionHeader icon={User} title="Perfil" />
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="relative group">
                <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center text-zinc-950 text-3xl font-black overflow-hidden border-4 border-zinc-100 dark:border-zinc-800">
                  {settings.photoUrl ? (
                    <img 
                      src={settings.photoUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    settings.name?.charAt(0) || '?'
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 flex gap-1">
                  <button 
                    onClick={() => photoInputRef.current?.click()}
                    className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                  >
                    <Upload size={14} />
                  </button>
                  {settings.photoUrl && (
                    <button 
                      onClick={handleRemovePhoto}
                      className="w-8 h-8 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={photoInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">{settings.name || 'Motorista'}</h3>
                <p className="text-xs text-zinc-500 font-medium">{user?.email}</p>
                <div className="mt-2">
                  <SyncIndicator />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                <Input 
                  value={settings.name} 
                  onChange={e => updateSettings({ name: e.target.value })}
                  className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Meta Diária (R$)</label>
                <Input 
                  type="number"
                  value={settings.dailyGoal === 0 ? '' : settings.dailyGoal} 
                  onChange={e => {
                    const val = e.target.value;
                    updateSettings({ dailyGoal: val === '' ? 0 : Number(val) });
                  }}
                  className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-black text-xl"
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Platforms Section */}
      <section className="space-y-4">
        <SectionHeader icon={Smartphone} title="Plataformas" />
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Modo de Transporte</label>
              <Select
                value={settings.transportMode}
                onChange={e => updateSettings({ transportMode: e.target.value as any })}
                className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
              >
                <option value="car">Uber / 99 / inDrive Carro</option>
                <option value="motorcycle">Uber / 99 / inDrive Moto</option>
              </Select>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-500 font-bold leading-relaxed uppercase tracking-wider">
                O DriverDash foca em Uber, 99 e inDrive para garantir a melhor experiência de fechamento financeiro.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Panel Preferences */}
      <section className="space-y-4">
        <SectionHeader icon={Layout} title="Preferências do Painel" />
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Modo do Dashboard</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => updateSettings({ dashboardMode: 'merged' })}
                  className={cn(
                    "py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    settings.dashboardMode === 'merged' 
                      ? "bg-white dark:bg-zinc-700 text-emerald-500 shadow-sm" 
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  )}
                >
                  Unificado
                </button>
                <button
                  onClick={() => updateSettings({ dashboardMode: 'segmented' })}
                  className={cn(
                    "py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    settings.dashboardMode === 'segmented' 
                      ? "bg-white dark:bg-zinc-700 text-emerald-500 shadow-sm" 
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  )}
                >
                  Segmentado
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium ml-1 mt-1">
                {settings.dashboardMode === 'merged' 
                  ? "Soma todos os ganhos em um único gráfico." 
                  : "Mostra ganhos separados por plataforma."}
              </p>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Tema do Aplicativo</p>
                <p className="text-[10px] text-zinc-500 font-medium">
                  {settings.theme === 'dark' ? 'Sempre Escuro (Otimizado)' : settings.theme === 'light' ? 'Sempre Claro' : 'Seguir Sistema'}
                </p>
              </div>
              <Select
                value={settings.theme || 'dark'}
                onChange={e => updateSettings({ theme: e.target.value as any })}
                className="w-32 h-10 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-xl font-bold text-xs"
              >
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
                <option value="system">Sistema</option>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Vehicle Profile Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <SectionHeader icon={Car} title="Perfil do Veículo" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsAddingVehicle(true)}
            className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 rounded-xl"
          >
            <Plus size={14} className="mr-1" /> Novo Carro
          </Button>
        </div>
        
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <CardContent className="p-6 space-y-6">
            {/* Vehicle Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Veículo Ativo</label>
              <button
                onClick={() => setShowVehicleSelector(true)}
                className="w-full h-16 px-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-between group hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all border border-zinc-100 dark:border-zinc-800/50 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Car size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black tracking-tight">
                      {currentVehicle?.name || 'Selecionar Veículo'}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      {currentVehicle ? `${currentVehicle.brand} ${currentVehicle.model}` : 'Nenhum veículo ativo'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 group-hover:text-emerald-500 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest">Trocar</span>
                  <ChevronDown size={18} />
                </div>
              </button>
            </div>

            {currentVehicle && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome do Carro</label>
                    <Input 
                      value={currentVehicle.name}
                      onChange={e => {
                        const updated = settings.vehicleProfiles?.map(v => v.id === currentVehicle.id ? { ...v, name: e.target.value } : v);
                        updateSettings({ 
                          vehicleProfiles: updated,
                          vehicle: e.target.value
                        });
                      }}
                      className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Ano</label>
                    <Input 
                      value={currentVehicle.year}
                      onChange={e => {
                        const updated = settings.vehicleProfiles?.map(v => v.id === currentVehicle.id ? { ...v, year: e.target.value } : v);
                        updateSettings({ vehicleProfiles: updated });
                      }}
                      className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Veículo</label>
                  <Select
                    value={currentVehicle.type}
                    onChange={e => {
                      const updated = settings.vehicleProfiles?.map(v => v.id === currentVehicle.id ? { ...v, type: e.target.value as any, fixedCosts: { ...v.fixedCosts, vehicleType: e.target.value as any } } : v);
                      updateSettings({ 
                        vehicleProfiles: updated,
                        fixedCosts: { ...settings.fixedCosts, vehicleType: e.target.value as any }
                      });
                    }}
                    className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                  >
                    <option value="owned">Veículo Próprio</option>
                    <option value="rented">Veículo Alugado</option>
                  </Select>
                </div>

                {currentVehicle.type === 'owned' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <CostInput 
                      label="Seguro" 
                      value={currentVehicle.fixedCosts.insurance} 
                      onChange={val => updateCurrentVehicleCosts({ insurance: val })} 
                    />
                    <CostInput 
                      label="IPVA" 
                      value={currentVehicle.fixedCosts.ipva} 
                      onChange={val => updateCurrentVehicleCosts({ ipva: val })} 
                    />
                    <CostInput 
                      label="Troca de Óleo" 
                      value={currentVehicle.fixedCosts.oilChange} 
                      onChange={val => updateCurrentVehicleCosts({ oilChange: val })} 
                    />
                    <CostInput 
                      label="Pneus" 
                      value={currentVehicle.fixedCosts.tires} 
                      onChange={val => updateCurrentVehicleCosts({ tires: val })} 
                    />
                    <CostInput 
                      label="Manutenção" 
                      value={currentVehicle.fixedCosts.maintenance} 
                      onChange={val => updateCurrentVehicleCosts({ maintenance: val })} 
                    />
                    <CostInput 
                      label="Parcela" 
                      value={currentVehicle.fixedCosts.financing} 
                      onChange={val => updateCurrentVehicleCosts({ financing: val })} 
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Aluguel</label>
                      <Select
                        value={currentVehicle.fixedCosts.rentalPeriod || 'weekly'}
                        onChange={e => updateCurrentVehicleCosts({ rentalPeriod: e.target.value as any })}
                        className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                      >
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal</option>
                      </Select>
                    </div>
                    <CostInput 
                      label="Valor do Aluguel" 
                      value={currentVehicle.fixedCosts.rentalValue} 
                      onChange={val => updateCurrentVehicleCosts({ rentalValue: val })} 
                    />
                  </div>
                )}

                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Custo Fixo Diário</p>
                    <p className="text-xl font-black text-emerald-500">
                      {formatCurrency(calculateDailyFixedCost(currentVehicle.fixedCosts))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Mensal</p>
                    <p className="text-sm font-bold text-zinc-400">
                      {formatCurrency(calculateMonthlyFixedCost(currentVehicle.fixedCosts))}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button 
                    onClick={handleSaveVehicle}
                    disabled={isSaving}
                    className={cn(
                      "w-full h-14 font-black text-lg rounded-2xl transition-all duration-300",
                      saveSuccess 
                        ? "bg-emerald-500 text-zinc-950" 
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-emerald-500 hover:text-zinc-950"
                    )}
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Salvando...
                      </span>
                    ) : saveSuccess ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 size={20} /> Perfil Salvo
                      </span>
                    ) : (
                      "Salvar Veículo"
                    )}
                  </Button>
                  
                  {saveSuccess && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-center font-black text-emerald-500 uppercase tracking-widest"
                    >
                      Perfil do veículo salvo com sucesso
                    </motion.p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Data Section */}
      <section className="space-y-4">
        <SectionHeader icon={Database} title="Dados" />
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <SettingsItem 
              icon={Download} 
              title="Exportar Backup" 
              description="Salvar seus dados em um arquivo JSON"
              onClick={exportBackup}
              color="text-blue-500"
            />
            <SettingsItem 
              icon={Upload} 
              title="Importar Backup" 
              description="Restaurar dados de um arquivo anterior"
              onClick={() => fileInputRef.current?.click()}
              color="text-emerald-500"
            />
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json"
              onChange={handleImportBackup}
            />
            <SettingsItem 
              icon={RefreshCw} 
              title="Sincronizar Agora" 
              description="Forçar atualização com a nuvem"
              onClick={() => syncData()}
              color="text-zinc-400"
              loading={syncStatus === 'syncing'}
            />
          </CardContent>
        </Card>
      </section>

      {/* System Section (Patch Notes) */}
      <section className="space-y-4">
        <SectionHeader icon={History} title="Sistema" />
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <PatchNotes />
          </CardContent>
        </Card>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4">
        <SectionHeader icon={Shield} title="Zona de Perigo" />
        <Card className="border-none bg-red-50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10">
          <CardContent className="p-6 space-y-4">
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center justify-between w-full group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <Trash2 size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-red-500">Limpar Todos os Dados</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Apagar histórico local e nuvem</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-red-300 group-hover:text-red-500 transition-colors" />
            </button>
            <div className="h-px bg-red-100 dark:bg-red-500/10" />
            <button 
              onClick={handleLogout}
              className="flex items-center justify-between w-full group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                  <LogOut size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-zinc-900 dark:text-white">Sair da Conta</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Desconectar deste dispositivo</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors" />
            </button>
          </CardContent>
        </Card>
      </section>

      {/* Vehicle Selector Bottom Sheet */}
      <AnimatePresence>
        {showVehicleSelector && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVehicleSelector(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 bg-white dark:bg-zinc-900 z-[110] rounded-t-[2.5rem] p-8 pb-12 max-h-[80vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-8" />
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">Meus Veículos</h3>
                  <p className="text-xs text-zinc-500 font-medium">Selecione o veículo que está usando agora</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowVehicleSelector(false);
                    setIsAddingVehicle(true);
                  }}
                  className="text-emerald-500 font-black uppercase tracking-widest text-[10px]"
                >
                  <Plus size={14} className="mr-1" /> Novo
                </Button>
              </div>

              <div className="space-y-3">
                {settings.vehicleProfiles?.map(v => (
                  <button
                    key={v.id}
                    onClick={() => handleSelectVehicle(v.id)}
                    className={cn(
                      "w-full p-4 rounded-2xl flex items-center justify-between transition-all border-2",
                      settings.currentVehicleProfileId === v.id
                        ? "bg-emerald-500/10 border-emerald-500"
                        : "bg-zinc-50 dark:bg-zinc-800/50 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        settings.currentVehicleProfileId === v.id ? "bg-emerald-500 text-zinc-950" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                      )}>
                        <Car size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-black tracking-tight">{v.name}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          {v.brand} {v.model} • {v.year}
                        </p>
                      </div>
                    </div>
                    {settings.currentVehicleProfileId === v.id ? (
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-zinc-950">
                        <CheckCircle2 size={16} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {settings.vehicleProfiles && settings.vehicleProfiles.length > 1 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVehicle(v.id);
                            }}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                        <ChevronRight size={18} className="text-zinc-300" />
                      </div>
                    )}
                  </button>
                ))}

                {(!settings.vehicleProfiles || settings.vehicleProfiles.length === 0) && (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 mx-auto">
                      <Car size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold">Nenhum veículo encontrado</p>
                      <p className="text-xs text-zinc-500">Cadastre seu primeiro veículo para começar</p>
                    </div>
                    <Button 
                      onClick={() => {
                        setShowVehicleSelector(false);
                        setIsAddingVehicle(true);
                      }}
                      className="bg-emerald-500 text-zinc-950 font-black"
                    >
                      Adicionar Veículo
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Vehicle Modal */}
      <AnimatePresence>
        {isAddingVehicle && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingVehicle(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed inset-x-4 bottom-10 md:inset-0 m-auto w-full max-w-md h-fit z-[110] p-6"
            >
              <Card className="border-none bg-white dark:bg-zinc-900 shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black tracking-tighter">Novo Veículo</h3>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingVehicle(false)}>Fechar</Button>
                  </div>
                  
                  <form onSubmit={handleAddVehicle} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome (Ex: HB20S)</label>
                      <Input name="name" required className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Marca</label>
                        <Input name="brand" className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Modelo</label>
                        <Input name="model" className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Ano</label>
                        <Input name="year" className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Placa (Opcional)</label>
                        <Input name="plate" className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo</label>
                        <Select name="type" className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold">
                          <option value="owned">Próprio</option>
                          <option value="rented">Alugado</option>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Categoria</label>
                        <Select name="category" className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold">
                          <option value="car">Carro</option>
                          <option value="motorcycle">Moto</option>
                        </Select>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isSaving}
                      className="w-full h-16 bg-emerald-500 text-zinc-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20 mt-4"
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                          Salvando...
                        </div>
                      ) : "Salvar Veículo"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-xs h-fit z-[110] p-6"
            >
              <Card className="border-none bg-white dark:bg-zinc-900 shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 mx-auto">
                    <AlertCircle size={40} />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black tracking-tighter">Apagar tudo?</h3>
                    <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                      Essa ação é irreversível. Todos os seus ciclos e configurações serão removidos.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button 
                      variant="danger" 
                      onClick={handleClearData}
                      disabled={isDeleting}
                      className="w-full h-16 text-lg font-black rounded-2xl shadow-xl shadow-red-500/20"
                    >
                      {isDeleting ? 'Apagando...' : 'Confirmar'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="w-full h-12 text-sm font-bold text-zinc-400"
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SectionHeader = ({ icon: Icon, title }: any) => (
  <div className="flex items-center gap-2 px-1">
    <Icon size={16} className="text-emerald-500" />
    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">{title}</h3>
  </div>
);

const CostInput = ({ label, value, onChange }: { label: string, value?: number, onChange: (val: number | undefined) => void }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">{label}</label>
    <Input 
      type="number"
      value={value === undefined ? '' : value} 
      onChange={e => {
        const val = e.target.value;
        onChange(val === '' ? undefined : Number(val));
      }}
      className="h-10 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-xl font-bold text-sm"
      placeholder="0,00"
    />
  </div>
);

const SettingsItem = ({ icon: Icon, title, description, onClick, color, loading, disabled }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled || loading}
    className={cn(
      "flex items-center justify-between w-full group py-2 transition-opacity",
      (disabled || loading) && "opacity-50 cursor-not-allowed"
    )}
  >
    <div className="flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center transition-colors", color)}>
        <Icon size={20} className={cn(loading && "animate-spin")} />
      </div>
      <div className="text-left">
        <p className="text-sm font-bold tracking-tight">{title}</p>
        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{description}</p>
      </div>
    </div>
    <ChevronRight size={18} className="text-zinc-200 group-hover:text-emerald-500 transition-colors" />
  </button>
);

const PatchNotes = () => {
  const [expanded, setExpanded] = useState<string | null>('2.7.0');

  const versions = [
    {
      id: '2.7.0',
      date: '20 Mar, 2026',
      notes: [
        'Mapa do trajeto (Beta): Novo mapa do ciclo com visualização do trajeto em tempo real.',
        'Exibição da rota percorrida durante o dia diretamente no aplicativo.',
        'Identificação de início e fim do trajeto com marcadores coloridos.',
        'Integração total com o sistema de KM automático.',
        'Funcionalidade em fase de testes (Beta), podendo apresentar pequenas imprecisões.'
      ]
    },
    {
      id: '2.6.0',
      date: '20 Mar, 2026',
      notes: [
        'Novo sistema de rastreamento automático de KM via GPS.',
        'Cálculo em tempo real de distância percorrida, tempo em movimento e tempo parado.',
        'Integração direta com o ciclo de trabalho ativo.',
        'Métricas de eficiência atualizadas automaticamente com base no KM rastreado.',
        'Controles intuitivos de Iniciar/Encerrar rastreamento no dashboard.',
        'Filtro inteligente de ruído para maior precisão na coleta de dados de localização.',
        'Melhoria na performance mobile e economia de bateria durante o rastreamento.'
      ]
    },
    {
      id: '2.5.0',
      date: '20 Mar, 2026',
      notes: [
        'Veículo agora é salvo por ciclo, garantindo integridade dos dados históricos.',
        'Novo sistema de insights automáticos no dashboard.',
        'Identificação do melhor dia da semana e pior desempenho por eficiência.',
        'Cálculo de média semanal de ganhos por KM e lucro total.',
        'Alertas inteligentes para baixa margem de lucro e baixa eficiência (R$/km).',
        'Sistema de sugestão de correções comparando prints importados com ciclos manuais.',
        'Otimização de performance nos cálculos do dashboard e relatórios.'
      ]
    },
    {
      id: '2.4.1',
      date: '18 Mar, 2026',
      notes: [
        'Corrigido problema onde os dados do veículo não eram salvos corretamente.',
        'Melhorias na persistência e sincronização do veículo ativo.',
        'Adicionado nível de confiança na leitura de relatórios por print.',
        'Melhorias na detecção de duplicidade.',
        'Nova organização na tela de revisão de importação.',
        'Identificação automática de relatórios diários e semanais.',
        'Comparação entre dados importados e lançamentos manuais.',
        'Cálculo automático da taxa real das plataformas.',
        'Novos indicadores como R$/km e análise de desempenho.',
        'Melhorias gerais de estabilidade e experiência.'
      ]
    },
    {
      id: '2.4.0',
      date: '18 Mar, 2026',
      notes: [
        'Novo sistema de importação de relatórios por screenshot dos aplicativos (Uber, 99 e inDrive).',
        'Agora é possível enviar prints e preencher automaticamente os dados de faturamento.',
        'Implementada leitura inteligente de imagem para extração de valores como ganhos totais, dinheiro, app, taxas e promoções.',
        'Adicionada tela de revisão antes de salvar os dados importados.',
        'Sistema de proteção contra duplicidade, evitando importação repetida do mesmo relatório.',
        'Estrutura preparada para comparação futura entre lançamentos manuais e dados reais dos aplicativos.',
        'Melhorias na precisão dos relatórios com base em dados oficiais das plataformas.'
      ]
    },
    {
      id: '2.1.3',
      date: '17 Mar, 2026',
      notes: [
        'Corrigido o fluxo de “Confirmar Fechamento”, agora com salvamento confiável dos dados do ciclo.',
        'Ajustado o redirecionamento após salvar para manter o usuário dentro do painel autenticado.',
        'Adicionado feedback visual de sucesso ao concluir o fechamento.',
        'Adicionado estado de carregamento no botão durante o salvamento.',
        'Melhorado o tratamento de erro para impedir perda de dados e evitar saída da tela em falhas.',
        'Incluído o veículo ativo no contexto salvo de cada ciclo.'
      ]
    },
    {
      id: '2.1.2',
      date: '17 Mar, 2026',
      notes: [
        'Corrigido o seletor de "Veículo Ativo", agora totalmente funcional.',
        'Agora é possível alternar entre veículos de forma rápida com um seletor interativo.',
        'Adicionado seletor moderno em formato bottom sheet para escolha de veículos.',
        'Implementada sincronização automática dos dados do veículo ativo com custos e métricas do app.',
        'Melhorado o comportamento ao excluir veículos, com troca automática do veículo ativo quando necessário.',
        'Garantida a integridade dos dados com criação automática de veículo padrão quando necessário.'
      ]
    },
    {
      id: '2.2.0',
      date: '18 Mar, 2026',
      notes: [
        'Novo sistema de análise de quilômetros por ciclo.',
        'Cálculo automático de KM de deslocamento.',
        'Métrica de custo operacional por KM.',
        'Dashboard com eficiência por KM.',
        'Lucro líquido por KM.',
        'Preparação para rastreamento por plataforma (Uber, 99 e inDrive).'
      ]
    },
    {
      id: '2.1.1',
      date: '17 Mar, 2026',
      notes: [
        'Correção no salvamento do perfil do veículo.',
        'Persistência de sessão aprimorada (evita logout ao atualizar).',
        'Melhoria nos campos numéricos (permite apagar valores).',
        'Adição da categoria inDrive nos seletores.',
        'Ajustes de estabilidade e performance no painel.'
      ]
    },
    {
      id: '2.1.0',
      date: '16 Mar, 2026',
      notes: [
        'Novo sistema de ciclos financeiros de 24h.',
        'Dashboard focado em performance e progresso.',
        'Lançamento rápido com modal bottom-sheet.',
        'Relatórios semanais com mix de plataformas.',
        'Interface premium inspirada em SaaS modernos.'
      ]
    },
    {
      id: '2.0.5',
      date: '10 Mar, 2026',
      notes: [
        'Otimização de sincronização com Supabase.',
        'Correção de erros no login persistente.',
        'Melhoria na exportação de backup JSON.'
      ]
    }
  ];

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {versions.map((v, idx) => {
        const isLatest = idx === 0;
        const isExpanded = expanded === v.id;
        
        return (
          <div key={v.id} className={cn("overflow-hidden transition-all", !isLatest && "bg-zinc-50/30 dark:bg-zinc-900/30")}>
            <button 
              onClick={() => setExpanded(isExpanded ? null : v.id)}
              className={cn(
                "w-full flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all",
                isLatest ? "p-6" : "p-4"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "rounded-lg flex items-center justify-center transition-all",
                  isLatest ? "w-8 h-8 bg-emerald-500/10 text-emerald-500" : "w-6 h-6 bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                )}>
                  <Zap size={isLatest ? 16 : 12} />
                </div>
                <div className="text-left">
                  <p className={cn("font-black tracking-tight", isLatest ? "text-sm" : "text-xs")}>
                    Versão {v.id} {isLatest && <span className="ml-2 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] rounded-md uppercase tracking-widest">Atual</span>}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{v.date}</p>
                </div>
              </div>
              <ChevronDown 
                size={isLatest ? 18 : 14} 
                className={cn("text-zinc-300 transition-transform duration-300", isExpanded && "rotate-180")} 
              />
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className={cn("pb-6 pt-2 space-y-3", isLatest ? "px-6" : "px-4 ml-9")}>
                    {v.notes.map((note, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <p className={cn("font-medium leading-relaxed", isLatest ? "text-xs text-zinc-600 dark:text-zinc-400" : "text-[11px] text-zinc-500 dark:text-zinc-500")}>
                          {note}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
