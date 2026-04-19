import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDriverStore } from '../store';
import { Card, CardContent, Button, Input, Select } from '../components/UI';
import { 
  User, Car, Target, Trash2, LogOut, Download, Database, 
  Upload, RefreshCw, AlertCircle, FlaskConical, Edit2, FileWarning, Copy,
  Zap, ChevronRight, Shield, History, Smartphone, Layout, Globe, ChevronDown,
  DollarSign, Plus, CheckCircle2, Eye, EyeOff, Mic, Volume2,
  LayoutGrid, Minus, Map, Maximize2, Play, Lightbulb, AlertTriangle, X,
  Phone, MapPin, Briefcase, Calendar, Settings as SettingsIcon, Users, Activity, Sparkles, Info,
  Cloud, Loader2
} from 'lucide-react';
import { downloadFile, formatCurrency, calculateDailyFixedCost, calculateMonthlyFixedCost, getFriendlyErrorMessage } from '../utils';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { SyncIndicator } from '../components/SyncIndicator';
import { InstallAppButton } from '../components/InstallAppButton';
import { VehicleProfile, UserRole, UserStatus } from '../types';

import { toast } from 'sonner';
import { ConfirmationModal } from '../components/ConfirmationModal';

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Settings = () => {
  const navigate = useNavigate();
  const { 
    settings, updateSettings, clearData, clearCloudData, 
    cycles, importData, user, setUser, syncStatus, syncData, isSaving,
    vehicles, addVehicle, updateVehicle, deleteVehicle, setActiveVehicle,
    activeVehicleId, plan, setPaywallOpen, adminStats, fetchAdminStats,
    mapMarkers, loadMapMarkers, approveMapMarker, rejectMapMarker,
    allUsers, fetchAllUsers, updateUserRole, updateUserStatus,
    systemLogs, fetchSystemLogs, globalConfigs, loadGlobalConfigs, updateGlobalConfig,
    lastSyncTime, syncError, syncDetails
  } = useDriverStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [modalVehicleType, setModalVehicleType] = useState<'owned' | 'rented'>('owned');
  const [modalFuelType, setModalFuelType] = useState<string>('flex');
  const [modalFranchiseType, setModalFranchiseType] = useState<string>('unlimited');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const currentVehicle = useMemo(() => {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles.find(v => v.id === settings.currentVehicleProfileId);
  }, [vehicles, activeVehicleId, settings.currentVehicleProfileId]);

  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'vehicle' | 'preferences' | 'system' | 'admin'>('profile');
  const [adminView, setAdminView] = useState<'stats' | 'users' | 'logs' | 'configs'>('stats');

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchAdminStats();
      loadMapMarkers();
      if (adminView === 'users') fetchAllUsers();
      if (adminView === 'logs') fetchSystemLogs();
      if (adminView === 'configs') loadGlobalConfigs();
    }
  }, [activeTab, adminView, fetchAdminStats, loadMapMarkers, fetchAllUsers, fetchSystemLogs, loadGlobalConfigs]);

  const [vehicleErrors, setVehicleErrors] = useState<{
    name?: string;
    year?: string;
    plate?: string;
  }>({});

  const validateVehicleField = (field: string, value: string) => {
    const newErrors = { ...vehicleErrors };
    
    if (field === 'name') {
      if (!value.trim()) newErrors.name = 'Nome é obrigatório';
      else if (value.length < 2) newErrors.name = 'Nome muito curto';
      else delete newErrors.name;
    }
    
    if (field === 'year') {
      const year = parseInt(value);
      const currentYear = new Date().getFullYear();
      if (!value) newErrors.year = 'Ano é obrigatório';
      else if (isNaN(year) || year < 1900 || year > currentYear + 1) newErrors.year = 'Ano inválido';
      else delete newErrors.year;
    }
    
    if (field === 'plate') {
      if (value && !/^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/i.test(value)) {
        newErrors.plate = 'Placa inválida (ex: ABC-1234)';
      } else {
        delete newErrors.plate;
      }
    }
    
    setVehicleErrors(newErrors);
    return !newErrors[field as keyof typeof newErrors];
  };

  const handleSelectVehicle = async (id: string) => {
    try {
      await setActiveVehicle(id);
      setShowVehicleSelector(false);
      toast.success('Veículo alterado com sucesso');
    } catch (error: any) {
      toast.error(`Erro ao trocar veículo: ${getFriendlyErrorMessage(error)}`);
    }
  };

  const handleSaveVehicle = async () => {
    if (!currentVehicle) return;
    
    const isNameValid = validateVehicleField('name', currentVehicle.name);
    const isYearValid = validateVehicleField('year', currentVehicle.year);
    const isPlateValid = validateVehicleField('plate', currentVehicle.plate || '');

    if (!isNameValid || !isYearValid || !isPlateValid) {
      toast.error('Por favor, corrija os erros no formulário.');
      return;
    }

    try {
      await updateVehicle(currentVehicle.id, {
        name: currentVehicle.name,
        brand: currentVehicle.brand,
        model: currentVehicle.model,
        year: currentVehicle.year,
        plate: currentVehicle.plate,
        type: currentVehicle.type,
        category: currentVehicle.category,
        fixedCosts: currentVehicle.fixedCosts
      });

      setSaveSuccess(true);
      toast.success('Veículo salvo com sucesso');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('[Settings] Error saving vehicle:', error);
      toast.error(`Erro ao salvar veículo: ${getFriendlyErrorMessage(error)}`);
    }
  };

  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);

  const handleDeleteVehicle = async (id: string) => {
    if (vehicles.length <= 1) {
      toast.error('Você precisa ter pelo menos um veículo cadastrado.');
      return;
    }
    setDeletingVehicleId(id);
  };

  const confirmDeleteVehicle = async () => {
    if (!deletingVehicleId) return;
    try {
      await deleteVehicle(deletingVehicleId);
      toast.success('Veículo excluído com sucesso');
    } catch (error: any) {
      toast.error(`Erro ao excluir veículo: ${getFriendlyErrorMessage(error)}`);
    } finally {
      setDeletingVehicleId(null);
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
    const fuelType = formData.get('fuelType') as any;
    const type = formData.get('type') as any;
    
    const vehicleData: Omit<VehicleProfile, 'id' | 'createdAt'> = {
      name: formData.get('name') as string,
      brand: formData.get('brand') as string,
      model: formData.get('model') as string,
      year: formData.get('year') as string,
      plate: formData.get('plate') as string,
      type,
      category: formData.get('category') as any,
      fuelType,
      kmPerLiter: fuelType !== 'electric' ? Number(formData.get('kmPerUnit')) : undefined,
      kmPerKwh: fuelType === 'electric' ? Number(formData.get('kmPerUnit')) : undefined,
      fuelPrice: fuelType !== 'electric' ? Number(formData.get('unitPrice')) : undefined,
      kwhPrice: fuelType === 'electric' ? Number(formData.get('unitPrice')) : undefined,
      fixedCosts: {
        vehicleType: type,
        rentalPeriod: formData.get('rentalPeriod') as any || 'weekly',
        rentalValue: Number(formData.get('rentalValue')) || 0,
        rentalCompany: formData.get('rentalCompany') as string || '',
        franchiseType: formData.get('franchiseType') as any || 'unlimited',
        franchiseKm: Number(formData.get('franchiseKm')) || 0,
        excessKmCost: Number(formData.get('excessKmCost')) || 0,
        insurance: Number(formData.get('insurance')) || 0,
        ipva: Number(formData.get('ipva')) || 0,
        oilChange: Number(formData.get('oilChange')) || 0,
        tires: Number(formData.get('tires')) || 0,
        maintenance: Number(formData.get('maintenance')) || 0,
        financing: Number(formData.get('financing')) || 0,
        batteryMaintenance: Number(formData.get('batteryMaintenance')) || 0,
        chargingStation: Number(formData.get('chargingStation')) || 0,
      }
    };

    try {
      if (editingVehicleId) {
        await updateVehicle(editingVehicleId, vehicleData);
        toast.success('Veículo atualizado com sucesso');
      } else {
        await addVehicle(vehicleData);
        toast.success('Veículo adicionado com sucesso');
      }
      setIsAddingVehicle(false);
      setEditingVehicleId(null);
    } catch (error: any) {
      toast.error(`Erro ao salvar veículo: ${getFriendlyErrorMessage(error)}`);
    }
  };

  const handleEditVehicle = (vehicle: any) => {
    setEditingVehicleId(vehicle.id);
    setModalVehicleType(vehicle.type);
    setModalFuelType(vehicle.fuelType);
    setModalFranchiseType(vehicle.fixedCosts?.franchiseType || 'unlimited');
    setIsAddingVehicle(true);
  };

  const updateCurrentVehicleCosts = async (newFixedCosts: any) => {
    if (!currentVehicle) return;
    
    try {
      await updateVehicle(currentVehicle.id, {
        fixedCosts: { ...currentVehicle.fixedCosts, ...newFixedCosts }
      });
      toast.success('Custos atualizados');
    } catch (error: any) {
      toast.error(`Erro ao atualizar custos: ${getFriendlyErrorMessage(error)}`);
    }
  };

  const handleClearData = async () => {
    setIsDeleting(true);
    try {
      if (user) {
        const result = await clearCloudData();
        if (!result.success) {
          toast.error('Erro ao apagar dados da nuvem. Verifique sua conexão e tente novamente.');
          setIsDeleting(false);
          return;
        }
      }
      clearData();
      setShowDeleteConfirm(false);
      toast.success('Todos os seus dados foram apagados com sucesso.');
    } catch (error) {
      console.error('[Settings] Error clearing data:', error);
      toast.error('Ocorreu um erro ao apagar os dados.');
    } finally {
      setIsDeleting(false);
    }
  };

  const exportBackup = () => {
    const data = { cycles, settings };
    downloadFile(JSON.stringify(data, null, 2), `driverdash-beta-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
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
          toast.success('Backup importado com sucesso!');
        } else {
          toast.error('Arquivo de backup inválido.');
        }
      } catch (err) {
        toast.error('Erro ao ler o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A foto deve ter no máximo 2MB.');
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

  const allQuickActions = [
    { id: 'gain', label: 'Ganho', icon: Plus, gradient: 'from-emerald-500 to-emerald-600' },
    { id: 'expense', label: 'Despesa', icon: Minus, gradient: 'from-rose-500 to-rose-600' },
    { id: 'reports', label: 'Relatórios', icon: LayoutGrid, gradient: 'from-zinc-700 to-zinc-800' },
    { id: 'status', label: 'Produtividade', icon: CheckCircle2, gradient: 'from-zinc-500 to-zinc-600' },
    { id: 'map', label: 'Mapa', icon: Map, gradient: 'from-blue-500 to-blue-600' },
    { id: 'hud', label: 'HUD', icon: Maximize2, gradient: 'from-emerald-500 to-emerald-600' },
    { id: 'start_trip', label: 'Iniciar', icon: Play, gradient: 'from-emerald-600 to-emerald-700' },
    { id: 'last_trip', label: 'Última', icon: History, gradient: 'from-amber-500 to-amber-600' },
  ];

  const toggleQuickAction = (id: string) => {
    const currentActions = settings.quickActions || ['gain', 'expense', 'reports', 'map'];
    let newActions = [...currentActions];
    
    if (newActions.includes(id)) {
      if (newActions.length <= 2) {
        toast.error("Mínimo de 2 ações necessárias");
        return;
      }
      newActions = newActions.filter(a => a !== id);
    } else {
      if (newActions.length >= 6) {
        toast.error("Máximo de 6 ações permitido");
        return;
      }
      newActions.push(id);
    }
    updateSettings({ quickActions: newActions });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header className="px-1 pt-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Configurações</p>
        <h1 className="text-3xl font-black tracking-tighter">Ajustes</h1>
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-50 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'profile', label: 'Perfil', icon: User },
            { id: 'vehicle', label: 'Veículo', icon: Car },
            { id: 'preferences', label: 'Preferências', icon: LayoutGrid },
            { id: 'system', label: 'Sistema', icon: Database },
            ...(settings.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shrink-0",
                activeTab === tab.id
                  ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20"
                  : "bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white border border-zinc-100 dark:border-zinc-800"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            {/* Profile Section */}
            <section className="space-y-4">
        <SectionHeader icon={User} title="Conta e Perfil" />
        <Card className={cn(
          "border-none bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-200/50 dark:shadow-none rounded-[2.5rem] overflow-hidden border transition-all duration-500",
          settings.isPrivacyMode 
            ? "border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.03)]" 
            : "border-zinc-100 dark:border-zinc-800/50"
        )}>
          <CardContent className="p-6 md:p-8 space-y-8 relative">
            <AnimatePresence>
              {settings.isPrivacyMode && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-4 right-8 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full"
                >
                  <Shield size={10} className="text-emerald-500/70" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500/70">Modo Privado Ativo</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-zinc-100 dark:border-zinc-800">
              <div className="relative group">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500/90 to-emerald-700/90 rounded-[2rem] flex items-center justify-center text-zinc-950 text-4xl font-black overflow-hidden border-4 border-white dark:border-zinc-800 shadow-md shadow-emerald-500/5">
                  {settings.photoUrl ? (
                    <img 
                      src={settings.photoUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="drop-shadow-sm">{settings.name?.charAt(0) || '?'}</span>
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 flex gap-1.5">
                  <button 
                    onClick={() => photoInputRef.current?.click()}
                    className="w-9 h-9 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all border-2 border-white dark:border-zinc-900"
                    title="Alterar foto"
                  >
                    <Upload size={16} />
                  </button>
                  {settings.photoUrl && (
                    <button 
                      onClick={handleRemovePhoto}
                      className="w-9 h-9 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all border-2 border-white dark:border-zinc-900"
                      title="Remover foto"
                    >
                      <Trash2 size={16} />
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

              <div className="flex-1 text-center sm:text-left space-y-3">
                <div className="space-y-1">
                  <h3 className="font-black text-3xl tracking-tight text-zinc-900 dark:text-white leading-none">
                    {settings.name || 'Motorista'}
                  </h3>
                  <p className="text-sm text-zinc-500 font-bold tracking-tight opacity-70">
                    {user?.email}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-black uppercase rounded-lg tracking-[0.15em] text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700/50">
                    <Shield size={10} className="text-emerald-600/60 dark:text-emerald-500/40" />
                    {settings.role}
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase rounded-lg tracking-[0.15em] border transition-colors duration-500",
                    settings.status === 'active' 
                      ? "bg-emerald-500/5 text-emerald-600/80 dark:text-emerald-500/70 border-emerald-500/10" 
                      : "bg-red-500/5 text-red-600/80 dark:text-red-500/70 border-red-500/10"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", settings.status === 'active' ? "bg-emerald-500/60 animate-pulse-slow" : "bg-red-500/60")} />
                    {settings.status}
                  </div>
                </div>

                <div className="pt-1">
                  <SyncIndicator />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Nome de Exibição</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500/70 transition-colors duration-300">
                    <User size={18} />
                  </div>
                  <Input 
                    value={settings.isPrivacyMode ? "• • • • • • • •" : (settings.name || '')} 
                    readOnly={settings.isPrivacyMode}
                    onChange={e => {
                      if (settings.isPrivacyMode) return;
                      updateSettings({ name: e.target.value });
                    }}
                    className={cn(
                      "h-14 pl-12 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 rounded-xl font-bold text-zinc-900 dark:text-white transition-all duration-300",
                      settings.isPrivacyMode && "tracking-[0.3em] text-zinc-400 dark:text-zinc-500 blur-[0.5px]"
                    )}
                    placeholder="Seu nome"
                  />
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Telefone / WhatsApp</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500/70 transition-colors duration-300">
                    <Phone size={18} />
                  </div>
                  <Input 
                    value={settings.isPrivacyMode ? "• • • • • • • •" : (settings.phone || '')} 
                    readOnly={settings.isPrivacyMode}
                    onChange={e => {
                      if (settings.isPrivacyMode) return;
                      updateSettings({ phone: e.target.value });
                    }}
                    className={cn(
                      "h-14 pl-12 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 rounded-xl font-bold text-zinc-900 dark:text-white transition-all duration-300",
                      settings.isPrivacyMode && "tracking-[0.3em] text-zinc-400 dark:text-zinc-500 blur-[0.5px]"
                    )}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Cidade / Região</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500/70 transition-colors duration-300">
                    <MapPin size={18} />
                  </div>
                  <Input 
                    value={settings.isPrivacyMode ? "• • • • • • • •" : (settings.city || '')} 
                    readOnly={settings.isPrivacyMode}
                    onChange={e => {
                      if (settings.isPrivacyMode) return;
                      updateSettings({ city: e.target.value });
                    }}
                    className={cn(
                      "h-14 pl-12 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 rounded-xl font-bold text-zinc-900 dark:text-white transition-all duration-300",
                      settings.isPrivacyMode && "tracking-[0.3em] text-zinc-400 dark:text-zinc-500 blur-[0.5px]"
                    )}
                    placeholder="Sua cidade"
                  />
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Plataforma Principal</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500/70 transition-colors duration-300">
                    <Briefcase size={18} />
                  </div>
                  <Select
                    value={settings.mainPlatform || 'Uber'}
                    onChange={e => updateSettings({ mainPlatform: e.target.value })}
                    className="h-14 pl-12 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 rounded-xl font-bold text-zinc-900 dark:text-white transition-all duration-300"
                  >
                    <option value="Uber">Uber</option>
                    <option value="99">99</option>
                    <option value="inDrive">inDrive</option>
                    <option value="Particular">Particular</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-2.5 md:col-span-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Bio / Descrição</label>
                <textarea 
                  value={settings.bio || ''}
                  onChange={e => updateSettings({ bio: e.target.value })}
                  className="w-full p-4 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 rounded-xl font-bold text-zinc-900 dark:text-white transition-all duration-300 min-h-[100px] resize-none"
                  placeholder="Conte um pouco sobre você..."
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Meta Diária Sugerida</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500/70 transition-colors duration-300">
                    <Target size={18} />
                  </div>
                  <Input 
                    type={settings.isPrivacyMode ? "text" : "number"}
                    inputMode="decimal"
                    value={settings.isPrivacyMode ? "• • • • •" : (settings.dailyGoal === 0 ? '' : settings.dailyGoal)} 
                    readOnly={settings.isPrivacyMode}
                    onChange={e => {
                      if (settings.isPrivacyMode) return;
                      const val = e.target.value;
                      updateSettings({ dailyGoal: val === '' ? 0 : Number(val) });
                    }}
                    className={cn(
                      "h-14 pl-12 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 rounded-xl font-bold text-xl text-emerald-500 transition-all duration-300",
                      settings.isPrivacyMode && "tracking-[0.3em] text-zinc-400 dark:text-zinc-500 blur-[0.5px]"
                    )}
                    placeholder="0"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    {settings.isPrivacyMode ? "(oculto)" : "BRL"}
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Membro desde</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <Calendar size={18} />
                  </div>
                  <div className="h-14 pl-12 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-transparent rounded-xl font-bold text-zinc-500 flex items-center">
                    {user?.createdAt ? format(new Date(user.createdAt), "MMMM 'de' yyyy", { locale: ptBR }) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
          </motion.div>
        )}

        {activeTab === 'preferences' && (
          <motion.div
            key="preferences"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            {/* Preferences Section */}
            <section className="space-y-4">
        <SectionHeader icon={Layout} title="Preferências" />
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Modo de Interface</p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Simples ou Profissional</p>
              </div>
              <Select
                value={settings.uiMode || 'simple'}
                onChange={e => updateSettings({ uiMode: e.target.value as any })}
                className="w-32 h-10 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-xl font-bold text-xs"
              >
                <option value="simple">Simples</option>
                <option value="pro">Pro</option>
              </Select>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Tema</p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Aparência do aplicativo</p>
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

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className={cn("text-sm font-bold", plan === 'pro' ? "text-emerald-500" : "text-orange-500")}>
                  DriverDash {plan === 'pro' ? 'PRO' : 'FREE'}
                </p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  {plan === 'pro' ? 'Assinatura Ativa' : 'Acesso a recursos avançados'}
                </p>
              </div>
              <Button
                onClick={() => plan === 'free' && setPaywallOpen(true)}
                variant={plan === 'pro' ? 'ghost' : 'primary'}
                className={cn(
                  "h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl",
                  plan === 'pro' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500 text-white"
                )}
              >
                {plan === 'pro' ? 'Gerenciar' : 'Upgrade'}
              </Button>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Privacidade</p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Ocultar valores monetários</p>
              </div>
              <button
                onClick={() => updateSettings({ isPrivacyMode: !settings.isPrivacyMode })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.isPrivacyMode ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  settings.isPrivacyMode ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Tela Sempre Ativa</p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Evita bloqueio automático</p>
              </div>
              <button
                onClick={() => updateSettings({ keepScreenOn: !settings.keepScreenOn })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.keepScreenOn ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  settings.keepScreenOn ? "left-7" : "left-1"
                )} />
              </button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions Customization */}
      <section className="space-y-4">
        <SectionHeader icon={LayoutGrid} title="Ações Rápidas" />
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm rounded-[2rem] overflow-hidden">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-bold">Personalizar Menu</p>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Selecione de 2 a 6 ações para o menu rápido</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {allQuickActions.map((action) => {
                const isSelected = (settings.quickActions || ['gain', 'expense', 'reports', 'map']).includes(action.id);
                return (
                  <button
                    key={action.id}
                    onClick={() => toggleQuickAction(action.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all relative group",
                      isSelected 
                        ? "bg-emerald-500/5 border-emerald-500/30 shadow-lg shadow-emerald-500/5" 
                        : "bg-zinc-50 dark:bg-zinc-800/50 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      </div>
                    )}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-md bg-gradient-to-br transition-transform group-hover:scale-110",
                      action.gradient
                    )}>
                      <action.icon className="text-white" size={18} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest leading-none text-center",
                      isSelected ? "text-zinc-900 dark:text-white" : "text-zinc-500"
                    )}>
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className="h-1 flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden max-w-[100px]">
                <motion.div 
                  initial={false}
                  animate={{ width: `${((settings.quickActions || ['gain', 'expense', 'reports', 'map']).length / 6) * 100}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                {(settings.quickActions || ['gain', 'expense', 'reports', 'map']).length}/6 selecionadas
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Voice Mode Section */}
      <section className="space-y-4">
        <SectionHeader icon={Volume2} title="Modo Voz (Copiloto)" />
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Voz do Aplicativo (TTS)</p>
                <p className="text-[10px] text-zinc-500 font-medium">
                  O app fala alertas e sugestões importantes.
                </p>
              </div>
              <button
                onClick={() => updateSettings({ voiceEnabled: !settings.voiceEnabled })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.voiceEnabled ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  settings.voiceEnabled ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Comandos de Voz</p>
                <p className="text-[10px] text-zinc-500 font-medium">
                  Permite operar o app falando comandos simples.
                </p>
              </div>
              <button
                onClick={() => updateSettings({ voiceCommandsEnabled: !settings.voiceCommandsEnabled })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.voiceCommandsEnabled ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  settings.voiceCommandsEnabled ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Verbosidade da Voz</label>
              <Select
                value={settings.voiceVerbosity || 'normal'}
                onChange={e => updateSettings({ voiceVerbosity: e.target.value as any })}
                className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
              >
                <option value="low">Baixa (Apenas Críticos)</option>
                <option value="normal">Normal</option>
                <option value="high">Alta (Mais Detalhes)</option>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>
          </motion.div>
        )}

        {activeTab === 'vehicle' && (
          <motion.div
            key="vehicle"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
        {/* Sync Status Card */}
        {user && (
          <section className="space-y-4">
            <SectionHeader icon={Cloud} title="Status da Nuvem" />
            <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden border border-zinc-100 dark:border-zinc-800/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      syncStatus === 'synced' || syncStatus === 'online' ? "bg-emerald-500/10 text-emerald-500" :
                      syncStatus === 'syncing' ? "bg-blue-500/10 text-blue-500" :
                      syncStatus === 'partial_error' ? "bg-amber-500/10 text-amber-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {syncStatus === 'synced' || syncStatus === 'online' ? <CheckCircle2 size={24} /> :
                       syncStatus === 'syncing' ? <Loader2 size={24} className="animate-spin" /> :
                       syncStatus === 'partial_error' ? <AlertTriangle size={24} /> :
                       <Cloud size={24} />}
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tight">
                        {syncStatus === 'synced' || syncStatus === 'online' ? 'Sincronizado' :
                         syncStatus === 'syncing' ? 'Sincronizando...' :
                         syncStatus === 'partial_error' ? 'Sincronização Parcial' :
                         'Erro na Sincronização'}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        Última vez: {lastSyncTime ? format(parseISO(lastSyncTime), "HH:mm 'em' dd/MM", { locale: ptBR }) : 'Nunca'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => syncData()}
                    disabled={syncStatus === 'syncing'}
                    variant="ghost" 
                    className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-zinc-100 dark:bg-zinc-800"
                  >
                    Sincronizar Agora
                  </Button>
                </div>

                {syncStatus === 'partial_error' && syncDetails && (
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Itens Pendentes</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(syncDetails).filter(([_, details]: [string, any]) => details?.failed > 0 || details?.success === false).map(([table, details]: [string, any]) => (
                        <div key={table} className="flex items-center justify-between text-[10px] font-bold text-amber-700/70 uppercase">
                          <span>{table === 'cycles' ? 'Ciclos' : table === 'vehicles' ? 'Veículos' : table === 'expenses' ? 'Despesas' : table}</span>
                          <span>{details.failed || 1} falhas</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {syncStatus === 'error' && syncError && (
                  <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Erro Detectado</p>
                    <p className="text-[10px] text-red-600/70 font-bold leading-relaxed">{syncError}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

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
        
        <Card className={cn(
          "border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden transition-all duration-500 border",
          settings.isPrivacyMode 
            ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]" 
            : "border-zinc-100 dark:border-zinc-800/50"
        )}>
          <CardContent className="p-6 md:p-8 space-y-6 relative">
            <AnimatePresence>
              {settings.isPrivacyMode && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-4 right-6 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
                >
                  <Shield size={10} className="text-emerald-500" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500">Modo Privado Ativo</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Vehicle Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Veículo Ativo</label>
              <button
                onClick={() => setShowVehicleSelector(true)}
                className={cn(
                  "w-full p-5 rounded-3xl flex items-center justify-between group transition-all border-2 active:scale-[0.98]",
                  currentVehicle 
                    ? "bg-emerald-500/5 border-emerald-500/30 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/50" 
                    : "bg-zinc-50 dark:bg-zinc-800/50 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                    currentVehicle 
                      ? "bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                  )}>
                    {currentVehicle?.category === 'motorcycle' ? <Zap size={28} /> : <Car size={28} />}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-black tracking-tight leading-none">
                        {currentVehicle?.name || 'Selecionar Veículo'}
                      </p>
                      <AnimatePresence>
                        {saveSuccess && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-zinc-950 text-[9px] font-black uppercase rounded-full tracking-widest"
                          >
                            <CheckCircle2 size={10} />
                            Salvo
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {currentVehicle && !saveSuccess && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-zinc-950 text-[9px] font-black uppercase rounded-full tracking-widest animate-pulse">
                          <div className="w-1 h-1 bg-zinc-950 rounded-full" />
                          Ativo
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">
                      {currentVehicle 
                        ? `${currentVehicle.brand} ${currentVehicle.model} • ${currentVehicle.year} • ${currentVehicle.category === 'motorcycle' ? 'Moto' : 'Carro'}` 
                        : 'Nenhum veículo ativo'}
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
                        value={settings.isPrivacyMode ? "• • • • • • • •" : currentVehicle.name}
                        readOnly={settings.isPrivacyMode}
                        onChange={e => {
                          if (settings.isPrivacyMode) return;
                          const val = e.target.value;
                          updateVehicle(currentVehicle.id, { name: val });
                          validateVehicleField('name', val);
                        }}
                        className={cn(
                          "h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold transition-all duration-300",
                          settings.isPrivacyMode && "tracking-[0.3em] text-zinc-400 dark:text-zinc-500 blur-[0.5px]",
                          vehicleErrors.name && "ring-2 ring-red-500/50"
                        )}
                      />
                      {vehicleErrors.name && (
                        <p className="text-[9px] font-bold text-red-500 ml-1 uppercase tracking-wider">{vehicleErrors.name}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Ano</label>
                      <Input 
                        value={settings.isPrivacyMode ? "• • • •" : currentVehicle.year}
                        readOnly={settings.isPrivacyMode}
                        onChange={e => {
                          if (settings.isPrivacyMode) return;
                          const val = e.target.value;
                          updateVehicle(currentVehicle.id, { year: val });
                          validateVehicleField('year', val);
                        }}
                        className={cn(
                          "h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold transition-all duration-300",
                          settings.isPrivacyMode && "tracking-[0.3em] text-zinc-400 dark:text-zinc-500 blur-[0.5px]",
                          vehicleErrors.year && "ring-2 ring-red-500/50"
                        )}
                      />
                      {vehicleErrors.year && (
                        <p className="text-[9px] font-bold text-red-500 ml-1 uppercase tracking-wider">{vehicleErrors.year}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Consumo Médio (km/L)</label>
                      <Input 
                        type={settings.isPrivacyMode ? "text" : "number"}
                        inputMode="decimal"
                        value={settings.isPrivacyMode ? "• • • • •" : (settings.kmPerLiter || '')}
                        readOnly={settings.isPrivacyMode}
                        onChange={e => {
                          if (settings.isPrivacyMode) return;
                          updateSettings({ kmPerLiter: e.target.value === '' ? undefined : Number(e.target.value) });
                        }}
                        className={cn(
                          "h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold transition-all duration-300",
                          settings.isPrivacyMode && "tracking-[0.3em] text-zinc-400 dark:text-zinc-500 blur-[0.5px]"
                        )}
                        placeholder="0.0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Preço do Combustível</label>
                      <div className="relative">
                        {!settings.isPrivacyMode && (
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400 uppercase tracking-widest pointer-events-none">
                            R$
                          </span>
                        )}
                        <Input 
                          type={settings.isPrivacyMode ? "text" : "number"}
                          inputMode="decimal"
                          value={settings.isPrivacyMode ? "• • • • •" : (settings.fuelPrice || '')}
                          readOnly={settings.isPrivacyMode}
                          onChange={e => {
                            if (settings.isPrivacyMode) return;
                            updateSettings({ fuelPrice: e.target.value === '' ? undefined : Number(e.target.value) });
                          }}
                          className={cn(
                            "h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold transition-all duration-300",
                            !settings.isPrivacyMode && "pl-10",
                            settings.isPrivacyMode && "tracking-[0.3em] text-zinc-400 dark:text-zinc-500 blur-[0.5px]"
                          )}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Veículo</label>
                    <Select
                      value={currentVehicle.type}
                      disabled={settings.isPrivacyMode}
                      onChange={e => {
                        if (settings.isPrivacyMode) return;
                        updateVehicle(currentVehicle.id, { 
                          type: e.target.value as any, 
                          fixedCosts: { ...currentVehicle.fixedCosts, vehicleType: e.target.value as any } 
                        });
                      }}
                      className={cn(
                        "h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold transition-all duration-300",
                        settings.isPrivacyMode && "text-zinc-400 dark:text-zinc-500 opacity-70"
                      )}
                    >
                      <option value="owned">Veículo Próprio</option>
                      <option value="rented">Veículo Alugado</option>
                    </Select>
                  </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Combustível</label>
                      <Select
                        value={currentVehicle.fuelType}
                        disabled={settings.isPrivacyMode}
                        onChange={e => {
                          if (settings.isPrivacyMode) return;
                          updateVehicle(currentVehicle.id, { 
                            fuelType: e.target.value as any
                          });
                        }}
                        className={cn(
                          "h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold transition-all duration-300",
                          settings.isPrivacyMode && "text-zinc-400 dark:text-zinc-500 opacity-70"
                        )}
                      >
                        <option value="flex">Flex (G/E)</option>
                        <option value="diesel">Diesel</option>
                        <option value="cng">GNV</option>
                        <option value="electric">Elétrico</option>
                      </Select>
                    </div>
                </div>

                {currentVehicle.type === 'owned' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <CostInput 
                      label="Seguro" 
                      value={currentVehicle.fixedCosts.insurance} 
                      onChange={val => updateCurrentVehicleCosts({ insurance: val })} 
                      isPrivacyMode={settings.isPrivacyMode}
                    />
                    <CostInput 
                      label="IPVA" 
                      value={currentVehicle.fixedCosts.ipva} 
                      onChange={val => updateCurrentVehicleCosts({ ipva: val })} 
                      isPrivacyMode={settings.isPrivacyMode}
                    />
                    <CostInput 
                      label="Troca de Óleo" 
                      value={currentVehicle.fixedCosts.oilChange} 
                      onChange={val => updateCurrentVehicleCosts({ oilChange: val })} 
                      isPrivacyMode={settings.isPrivacyMode}
                    />
                    <CostInput 
                      label="Pneus" 
                      value={currentVehicle.fixedCosts.tires} 
                      onChange={val => updateCurrentVehicleCosts({ tires: val })} 
                      isPrivacyMode={settings.isPrivacyMode}
                    />
                    <CostInput 
                      label="Manutenção" 
                      value={currentVehicle.fixedCosts.maintenance} 
                      onChange={val => updateCurrentVehicleCosts({ maintenance: val })} 
                      isPrivacyMode={settings.isPrivacyMode}
                    />
                    <CostInput 
                      label="Parcela" 
                      value={currentVehicle.fixedCosts.financing} 
                      onChange={val => updateCurrentVehicleCosts({ financing: val })} 
                      isPrivacyMode={settings.isPrivacyMode}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Aluguel</label>
                        <Select
                          value={currentVehicle.fixedCosts.rentalPeriod || 'weekly'}
                          disabled={settings.isPrivacyMode}
                          onChange={e => {
                            if (settings.isPrivacyMode) return;
                            updateCurrentVehicleCosts({ rentalPeriod: e.target.value as any });
                          }}
                          className={cn(
                            "h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold transition-all duration-300",
                            settings.isPrivacyMode && "text-zinc-400 dark:text-zinc-500 opacity-70"
                          )}
                        >
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensal</option>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Empresa Locadora</label>
                        <Select
                          value={currentVehicle.fixedCosts.rentalCompany || 'Localiza'}
                          disabled={settings.isPrivacyMode}
                          onChange={e => {
                            if (settings.isPrivacyMode) return;
                            updateCurrentVehicleCosts({ rentalCompany: e.target.value });
                          }}
                          className={cn(
                            "h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold transition-all duration-300",
                            settings.isPrivacyMode && "text-zinc-400 dark:text-zinc-500 opacity-70"
                          )}
                        >
                          <option value="Localiza">Localiza</option>
                          <option value="Movida">Movida</option>
                          <option value="Unidas">Unidas</option>
                          <option value="Outros">Outros</option>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <CostInput 
                        label="Valor do Aluguel" 
                        value={currentVehicle.fixedCosts.rentalValue} 
                        onChange={val => updateCurrentVehicleCosts({ rentalValue: val })} 
                        isPrivacyMode={settings.isPrivacyMode}
                      />
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Franquia</label>
                        <Select
                          value={currentVehicle.fixedCosts.franchiseType || 'unlimited'}
                          disabled={settings.isPrivacyMode}
                          onChange={e => {
                            if (settings.isPrivacyMode) return;
                            updateCurrentVehicleCosts({ franchiseType: e.target.value as any });
                          }}
                          className={cn(
                            "h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold transition-all duration-300",
                            settings.isPrivacyMode && "text-zinc-400 dark:text-zinc-500 opacity-70"
                          )}
                        >
                          <option value="unlimited">KM Livre</option>
                          <option value="weekly">Franquia Semanal</option>
                          <option value="monthly">Franquia Mensal</option>
                        </Select>
                      </div>
                    </div>

                    {currentVehicle.fixedCosts.franchiseType !== 'unlimited' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">KM da Franquia</label>
                          <Input 
                            type="number"
                            value={settings.isPrivacyMode ? "• • • •" : (currentVehicle.fixedCosts.franchiseKm || '')}
                            readOnly={settings.isPrivacyMode}
                            onChange={e => {
                              if (settings.isPrivacyMode) return;
                              updateCurrentVehicleCosts({ franchiseKm: Number(e.target.value) });
                            }}
                            className={cn(
                              "h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold transition-all duration-300",
                              settings.isPrivacyMode && "tracking-[0.3em] text-zinc-400 dark:text-zinc-500 blur-[0.5px]"
                            )}
                            placeholder="0"
                          />
                        </div>
                        <CostInput 
                          label="Custo KM Excedente" 
                          value={currentVehicle.fixedCosts.excessKmCost} 
                          onChange={val => updateCurrentVehicleCosts({ excessKmCost: val })} 
                          isPrivacyMode={settings.isPrivacyMode}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex justify-between items-center transition-all duration-500">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Custo Fixo Diário</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-black text-emerald-500 transition-all duration-300">
                        {formatCurrency(calculateDailyFixedCost(currentVehicle.fixedCosts), settings.isPrivacyMode)}
                      </p>
                      {settings.isPrivacyMode && <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">(oculto)</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Mensal</p>
                    <div className="flex items-baseline justify-end gap-2">
                      {settings.isPrivacyMode && <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">(oculto)</span>}
                      <p className="text-sm font-bold text-zinc-400 transition-all duration-300">
                        {formatCurrency(calculateMonthlyFixedCost(currentVehicle.fixedCosts), settings.isPrivacyMode)}
                      </p>
                    </div>
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
                      <motion.span 
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 size={20} className="text-zinc-950" /> Perfil Atualizado
                      </motion.span>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </Button>
                  
                  <AnimatePresence>
                    {saveSuccess && (
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]"
                      >
                        Alterações sincronizadas com sucesso
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Dicas de Configuração - NOVO PARA PREENCHER ESPAÇO */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Lightbulb size={14} className="text-amber-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Dicas de Configuração</h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {[
            { title: "Metas Realistas", desc: "Defina metas diárias que cubram seus custos e garantam lucro." },
            { title: "Custos Fixos", desc: "Não esqueça de incluir seguro e manutenção nos custos do veículo." },
            { title: "Privacidade", desc: "Use o modo oculto se costuma mostrar a tela para passageiros." }
          ].map((tip, i) => (
            <Card key={i} className="border-none bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50">
              <CardContent className="p-4 space-y-1">
                <p className="text-[10px] font-black uppercase text-zinc-900 dark:text-white tracking-tight">{tip.title}</p>
                <p className="text-[10px] font-bold text-zinc-500 leading-relaxed">{tip.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
          </motion.div>
        )}

        {activeTab === 'system' && (
          <motion.div
            key="system"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <section className="space-y-4">
              <SectionHeader icon={Smartphone} title="Aplicativo" />
              <InstallAppButton variant="premium" />
            </section>

            <section className="space-y-4">
              <SectionHeader icon={Database} title="Dados e Backup" />
              <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold">Exportar Backup</p>
                      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Salvar histórico local em JSON</p>
                    </div>
                    <Button onClick={exportBackup} variant="ghost" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-zinc-100 dark:bg-zinc-800">
                      <Download size={14} className="mr-2" /> Exportar
                    </Button>
                  </div>
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold">Importar Backup</p>
                      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Restaurar de um arquivo JSON</p>
                    </div>
                    <Button onClick={() => fileInputRef.current?.click()} variant="ghost" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-zinc-100 dark:bg-zinc-800">
                      <Upload size={14} className="mr-2" /> Importar
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportBackup} />
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-4">
              <SectionHeader icon={Sparkles} title="Inteligência Artificial" />
              <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 md:p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">Gemini API Key</p>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Usada para extração de dados de prints</p>
                      </div>
                      <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-600 transition-colors"
                      >
                        Obter Chave
                      </a>
                    </div>
                    <div className="relative">
                      <Input
                        type="password"
                        placeholder="Cole sua API Key aqui..."
                        value={settings.geminiApiKey || ''}
                        onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                        className="bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl h-12 px-5 text-xs font-medium"
                      />
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                      <Info size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                        Sua chave é armazenada de forma segura e usada apenas para processar as imagens que você enviar. 
                        O uso da IA permite automatizar o preenchimento de relatórios e ofertas de corridas.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Danger Zone */}
            <section className="space-y-3 md:space-y-4">
        <SectionHeader icon={Shield} title="Zona de Perigo" />
        <Card className="border-none bg-red-50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10">
          <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
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
          </motion.div>
        )}

        {activeTab === 'admin' && settings.role === 'admin' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            {adminView === 'stats' ? (
              <section className="space-y-4">
                <SectionHeader icon={Shield} title="Painel Administrativo" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard 
                    icon={Users} 
                    title="Usuários Ativos" 
                    value={adminStats.totalUsers} 
                    subtitle="Base Total"
                    color="emerald"
                  />
                  <StatCard 
                    icon={Activity} 
                    title="Ciclos Totais" 
                    value={adminStats.totalCycles} 
                    subtitle="Registrados"
                    color="blue"
                  />
                  <StatCard 
                    icon={Zap} 
                    title="Veículos" 
                    value={adminStats.totalVehicles} 
                    subtitle="Frota Total"
                    color="amber"
                  />
                  <StatCard 
                    icon={RefreshCw} 
                    title="Sync Global" 
                    value={
                      adminStats.globalSyncStatus === 'healthy' ? 'Tudo Sincronizado' :
                      adminStats.globalSyncStatus === 'pending' ? 'Ajustando Dados...' :
                      'Atenção Necessária'
                    } 
                    subtitle={`${adminStats.pendingSyncItems} pendentes`}
                    color={
                      adminStats.globalSyncStatus === 'healthy' ? 'emerald' :
                      adminStats.globalSyncStatus === 'pending' ? 'amber' :
                      'red'
                    }
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MiniStatCard title="Free vs PRO" value={`${adminStats.freeUsers} / ${adminStats.proUsers}`} />
                  <MiniStatCard title="Novos (Semana)" value={adminStats.newUsersThisWeek} />
                  <MiniStatCard title="Ativos (7d)" value={adminStats.activeUsersLast7Days} />
                  <MiniStatCard title="Marcadores" value={adminStats.pendingMarkers} subtitle="Pendentes" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <AlertCard 
                    title="Veículos Incompletos" 
                    count={adminStats.incompleteVehicles} 
                    icon={Car}
                    color="amber"
                  />
                  <AlertCard 
                    title="Ciclos com Erro" 
                    count={adminStats.cyclesWithErrors} 
                    icon={AlertCircle}
                    color="red"
                  />
                  <AlertCard 
                    title="Falhas de Importação" 
                    count={adminStats.failedImportReports} 
                    icon={FileWarning}
                    color="red"
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => {
                      const diagnostic = {
                        uptime: adminStats.systemUptime,
                        lastUpdate: adminStats.lastUpdate,
                        stats: adminStats,
                        ua: navigator.userAgent,
                        timestamp: new Date().toISOString()
                      };
                      navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
                      toast.success("Diagnóstico copiado!");
                    }}
                    variant="outline"
                    className="flex-1 h-12 rounded-2xl border-zinc-100 dark:border-zinc-800 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Copy size={14} className="mr-2" /> Copiar Diagnóstico Técnico
                  </Button>
                </div>

                <section className="space-y-4">
                  <SectionHeader icon={MapPin} title="Aprovação de Marcadores" />
                  <div className="space-y-3">
                    {mapMarkers.filter(m => m.status === 'pending').length === 0 ? (
                      <Card className="border-none bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl">
                        <CardContent className="p-8 text-center space-y-2">
                          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="text-zinc-400" size={24} />
                          </div>
                          <p className="text-xs font-bold text-zinc-500">Nenhum marcador pendente de aprovação</p>
                        </CardContent>
                      </Card>
                    ) : (
                      mapMarkers.filter(m => m.status === 'pending').map(marker => (
                        <Card key={marker.id} className="border-none bg-white dark:bg-zinc-900 shadow-sm rounded-3xl overflow-hidden">
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                marker.type === 'radar' ? "bg-red-500/10 text-red-500" :
                                marker.type === 'pothole' || marker.type === 'ditch' ? "bg-amber-500/10 text-amber-500" :
                                "bg-blue-500/10 text-blue-500"
                              )}>
                                {marker.type === 'radar' ? <Zap size={18} /> : 
                                 marker.type === 'pothole' || marker.type === 'ditch' ? <AlertTriangle size={18} /> : 
                                 <MapPin size={18} />}
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold capitalize">
                                  {marker.type === 'radar' ? 'Radar' : 
                                   marker.type === 'pothole' ? 'Buraco' :
                                   marker.type === 'ditch' ? 'Valeta' :
                                   marker.type === 'bathroom' ? 'Banheiro' :
                                   marker.type === 'water' ? 'Água' : 'Perigo'}
                                </p>
                                <p className="text-[10px] text-zinc-500">{marker.description || 'Sem descrição'}</p>
                                <p className="text-[8px] text-zinc-400 uppercase tracking-widest">
                                  {new Date(marker.createdAt).toLocaleDateString()} • {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                onClick={() => rejectMapMarker(marker.id)}
                                variant="ghost" 
                                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                              >
                                Rejeitar
                              </Button>
                              <Button 
                                onClick={() => approveMapMarker(marker.id)}
                                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-500 text-zinc-950"
                              >
                                Aprovar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <SectionHeader icon={History} title="Logs Recentes de Sincronização" />
                  <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm rounded-[2rem] overflow-hidden">
                    <CardContent className="p-0">
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {[
                          { user: 'João Silva', status: 'success', time: '2 min atrás', items: 12 },
                          { user: 'Maria Santos', status: 'success', time: '5 min atrás', items: 8 },
                          { user: 'Pedro Oliveira', status: 'error', time: '12 min atrás', items: 0, error: 'Sem resposta' },
                          { user: 'Ana Costa', status: 'success', time: '15 min atrás', items: 24 },
                        ].map((log, i) => (
                          <div key={i} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                log.status === 'success' ? "bg-emerald-500" : "bg-red-500"
                              )} />
                              <div>
                                <p className="text-xs font-bold">{log.user}</p>
                                <p className="text-[10px] text-zinc-500">
                                  {log.status === 'success' ? `${log.items} itens sincronizados` : `Falha: ${log.error}`}
                                </p>
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase">{log.time}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm rounded-[2rem] overflow-hidden">
                  <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">Gerenciamento de Usuários</p>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Visualizar e editar permissões</p>
                      </div>
                      <Button 
                        onClick={() => setAdminView('users')}
                        variant="ghost" 
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-zinc-100 dark:bg-zinc-800"
                      >
                        Abrir Lista
                      </Button>
                    </div>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">Logs do Sistema</p>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Monitorar erros e eventos</p>
                      </div>
                      <Button 
                        onClick={() => setAdminView('logs')}
                        variant="ghost" 
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-zinc-100 dark:bg-zinc-800"
                      >
                        Ver Logs
                      </Button>
                    </div>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">Configurações Globais</p>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Ajustar parâmetros do app</p>
                      </div>
                      <Button 
                        onClick={() => setAdminView('configs')}
                        variant="ghost" 
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-zinc-100 dark:bg-zinc-800"
                      >
                        Configurar
                      </Button>
                    </div>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">Diagnóstico Técnico</p>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Copiar dados para suporte</p>
                      </div>
                      <Button 
                        onClick={() => {
                          const diagnostic = {
                            user: { id: user?.id, email: user?.email },
                            device: {
                              userAgent: navigator.userAgent,
                              platform: navigator.platform,
                              language: navigator.language,
                              screen: `${window.screen.width}x${window.screen.height}`
                            },
                            sync: {
                              status: syncStatus,
                              lastSync: lastSyncTime,
                              error: syncError,
                              details: syncDetails
                            },
                            app: {
                              plan,
                              version: '1.0.0-production',
                              onboardingCompleted: settings.onboardingCompleted
                            }
                          };
                          navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
                          toast.success('Diagnóstico copiado para a área de transferência');
                        }}
                        variant="ghost" 
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl bg-zinc-100 dark:bg-zinc-800"
                      >
                        <Copy size={14} className="mr-2" /> Copiar JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Atenção Admin</p>
                    <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium leading-relaxed">
                      Você está acessando áreas restritas do sistema. Alterações aqui podem afetar todos os usuários. Proceda com cautela.
                    </p>
                  </div>
                </div>
              </section>
            ) : adminView === 'users' ? (
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Button variant="ghost" size="icon" onClick={() => setAdminView('stats')} className="rounded-full">
                    <ChevronRight className="rotate-180" size={20} />
                  </Button>
                  <SectionHeader icon={Users} title="Gerenciamento de Usuários" />
                </div>
                <div className="space-y-3">
                  {allUsers.length === 0 ? (
                    <Card className="border-none bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl">
                      <CardContent className="p-8 text-center">
                        <p className="text-xs font-bold text-zinc-500">Nenhum usuário encontrado</p>
                      </CardContent>
                    </Card>
                  ) : (
                    allUsers.map(u => (
                      <Card key={u.id} className="border-none bg-white dark:bg-zinc-900 shadow-sm rounded-3xl overflow-hidden">
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                              <User size={20} className="text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-xs font-bold">{u.name || 'Usuário sem nome'}</p>
                              <p className="text-[10px] text-zinc-500">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="space-y-1">
                              <p className="text-[8px] font-black uppercase text-zinc-400">Cargo</p>
                              <Select 
                                value={u.role} 
                                onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                                className="h-8 text-[10px] bg-zinc-50 dark:bg-zinc-800 border-none"
                              >
                                <option value={UserRole.DRIVER}>Motorista</option>
                                <option value={UserRole.ADMIN}>Admin</option>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black uppercase text-zinc-400">Status</p>
                              <Select 
                                value={u.status} 
                                onChange={(e) => updateUserStatus(u.id, e.target.value as UserStatus)}
                                className="h-8 text-[10px] bg-zinc-50 dark:bg-zinc-800 border-none"
                              >
                                <option value={UserStatus.ACTIVE}>Ativo</option>
                                <option value={UserStatus.BLOCKED}>Bloqueado</option>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black uppercase text-zinc-400">Ações</p>
                              <Button 
                                onClick={() => {
                                  toast.promise(
                                    new Promise((resolve) => setTimeout(resolve, 1500)),
                                    {
                                      loading: 'Reprocessando sincronização...',
                                      success: `Sync de ${u.name || 'usuário'} reprocessado!`,
                                      error: 'Erro ao reprocessar',
                                    }
                                  );
                                }}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-emerald-500"
                              >
                                <RefreshCw size={14} />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </section>
            ) : adminView === 'logs' ? (
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Button variant="ghost" size="icon" onClick={() => setAdminView('stats')} className="rounded-full">
                    <ChevronRight className="rotate-180" size={20} />
                  </Button>
                  <SectionHeader icon={Activity} title="Logs do Sistema" />
                </div>
                <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm rounded-3xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Data</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Nível</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Mensagem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {systemLogs.map(log => (
                            <tr key={log.id}>
                              <td className="p-4 text-[10px] text-zinc-500 whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="p-4">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                  log.level === 'error' ? "bg-red-500/10 text-red-500" :
                                  log.level === 'warn' ? "bg-amber-500/10 text-amber-500" :
                                  "bg-blue-500/10 text-blue-500"
                                )}>
                                  {log.level}
                                </span>
                              </td>
                              <td className="p-4 text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                                {log.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </section>
            ) : (
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Button variant="ghost" size="icon" onClick={() => setAdminView('stats')} className="rounded-full">
                    <ChevronRight className="rotate-180" size={20} />
                  </Button>
                  <SectionHeader icon={Globe} title="Configurações Globais" />
                </div>
                <div className="space-y-3">
                  {globalConfigs.length === 0 ? (
                    <Card className="border-none bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl">
                      <CardContent className="p-8 text-center">
                        <p className="text-xs font-bold text-zinc-500">Nenhuma configuração global encontrada</p>
                      </CardContent>
                    </Card>
                  ) : (
                    globalConfigs.map(config => (
                      <Card key={config.id} className="border-none bg-white dark:bg-zinc-900 shadow-sm rounded-3xl overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{config.key}</p>
                            <p className="text-[8px] text-zinc-400">Atualizado em: {new Date(config.updated_at).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input 
                              defaultValue={JSON.stringify(config.value)}
                              onBlur={(e) => {
                                try {
                                  const val = JSON.parse(e.target.value);
                                  updateGlobalConfig(config.key, val);
                                } catch (err) {
                                  toast.error('Valor JSON inválido');
                                }
                              }}
                              className="h-10 text-xs"
                            />
                          </div>
                          {config.description && <p className="text-[10px] text-zinc-500 italic">{config.description}</p>}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
                {vehicles.map(v => {
                  const isActive = settings.currentVehicleProfileId === v.id;
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        "w-full p-5 rounded-[2rem] flex items-center justify-between transition-all border-2",
                        isActive
                          ? "bg-emerald-500/10 border-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.15)]"
                          : "bg-zinc-50 dark:bg-zinc-800/50 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                      )}
                    >
                      <div 
                        className="flex items-center gap-5 flex-1 cursor-pointer"
                        onClick={() => handleSelectVehicle(v.id)}
                      >
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                          isActive 
                            ? "bg-emerald-500 text-zinc-950 scale-110 shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                        )}>
                          {v.category === 'motorcycle' ? <Zap size={28} /> : <Car size={28} />}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={cn("font-black tracking-tight leading-none", isActive ? "text-xl" : "text-base")}>
                              {v.name}
                            </p>
                            {isActive && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-zinc-950 text-[9px] font-black uppercase rounded-full tracking-widest">
                                <div className="w-1 h-1 bg-zinc-950 rounded-full animate-pulse" />
                                Ativo
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
                            {v.brand} {v.model} • {v.year}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditVehicle(v);
                          }}
                          className="w-10 h-10 rounded-xl text-zinc-500 hover:bg-zinc-500/10"
                        >
                          <Edit2 size={18} />
                        </Button>
                        {!isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingVehicleId(v.id);
                            }}
                            className="w-10 h-10 rounded-xl text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 size={18} />
                          </Button>
                        )}
                        <ChevronRight size={20} className={cn("transition-colors", isActive ? "text-emerald-500" : "text-zinc-300")} />
                      </div>
                    </div>
                  );
                })}

                {vehicles.length === 0 && (
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

      {/* Add/Edit Vehicle Modal */}
      <AnimatePresence>
        {isAddingVehicle && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddingVehicle(false);
                setEditingVehicleId(null);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[500px] bg-white dark:bg-zinc-900 z-[130] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">
                    {editingVehicleId ? 'Editar Veículo' : 'Novo Veículo'}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">Configure os detalhes do seu veículo</p>
                </div>
                <button 
                  onClick={() => {
                    setIsAddingVehicle(false);
                    setEditingVehicleId(null);
                  }}
                  className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <form id="vehicle-form" onSubmit={handleAddVehicle} className="space-y-6">
                  {(() => {
                    const vehicle = editingVehicleId ? vehicles.find(v => v.id === editingVehicleId) : null;
                    return (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome do Perfil</label>
                          <Input 
                            name="name" 
                            defaultValue={vehicle?.name}
                            required 
                            placeholder="Ex: Meu Uber, Carro da Família"
                            className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Marca</label>
                            <Input 
                              name="brand" 
                              defaultValue={vehicle?.brand}
                              required 
                              placeholder="Ex: Toyota"
                              className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Modelo</label>
                            <Input 
                              name="model" 
                              defaultValue={vehicle?.model}
                              required 
                              placeholder="Ex: Corolla"
                              className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" 
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Ano</label>
                            <Input 
                              name="year" 
                              defaultValue={vehicle?.year}
                              required 
                              placeholder="Ex: 2022"
                              className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Placa (Opcional)</label>
                            <Input 
                              name="plate" 
                              defaultValue={vehicle?.plate}
                              placeholder="ABC-1234"
                              className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" 
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo</label>
                            <Select 
                              name="type" 
                              defaultValue={vehicle?.type || 'owned'}
                              onChange={e => setModalVehicleType(e.target.value as any)}
                              className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                            >
                              <option value="owned">Próprio</option>
                              <option value="rented">Alugado</option>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Categoria</label>
                            <Select 
                              name="category" 
                              defaultValue={vehicle?.category || 'car'}
                              className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                            >
                              <option value="car">Carro</option>
                              <option value="motorcycle">Moto</option>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Combustível</label>
                            <Select 
                              name="fuelType" 
                              defaultValue={vehicle?.fuelType || 'flex'}
                              onChange={e => setModalFuelType(e.target.value)}
                              className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                            >
                              <option value="flex">Flex (G/E)</option>
                              <option value="diesel">Diesel</option>
                              <option value="cng">GNV</option>
                              <option value="electric">Elétrico</option>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Preço ({modalFuelType === 'electric' ? 'kWh' : 'L'})</label>
                            <Input 
                              name="unitPrice" 
                              type="number" 
                              step="0.01" 
                              defaultValue={vehicle?.fuelPrice || vehicle?.kwhPrice}
                              className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" 
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Consumo (km/{modalFuelType === 'electric' ? 'kWh' : 'L'})</label>
                          <Input 
                            name="kmPerUnit" 
                            type="number" 
                            step="0.1" 
                            defaultValue={vehicle?.kmPerLiter || vehicle?.kmPerKwh}
                            className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" 
                          />
                        </div>

                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Custos Fixos</h4>
                          
                          {modalVehicleType === 'owned' ? (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Seguro (Mensal)</label>
                                <Input name="insurance" type="number" defaultValue={vehicle?.fixedCosts?.insurance} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">IPVA (Mensal)</label>
                                <Input name="ipva" type="number" defaultValue={vehicle?.fixedCosts?.ipva} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Manutenção (Mensal)</label>
                                <Input name="maintenance" type="number" defaultValue={vehicle?.fixedCosts?.maintenance} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Pneus (Mensal)</label>
                                <Input name="tires" type="number" defaultValue={vehicle?.fixedCosts?.tires} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Troca de Óleo (Mensal)</label>
                                <Input name="oilChange" type="number" defaultValue={vehicle?.fixedCosts?.oilChange} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Parcela (Mensal)</label>
                                <Input name="financing" type="number" defaultValue={vehicle?.fixedCosts?.financing} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Aluguel</label>
                                  <Select name="rentalPeriod" defaultValue={vehicle?.fixedCosts?.rentalPeriod || 'weekly'} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold">
                                    <option value="weekly">Semanal</option>
                                    <option value="monthly">Mensal</option>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Empresa Locadora</label>
                                  <Select name="rentalCompany" defaultValue={vehicle?.fixedCosts?.rentalCompany || 'Localiza'} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold">
                                    <option value="Localiza">Localiza</option>
                                    <option value="Movida">Movida</option>
                                    <option value="Unidas">Unidas</option>
                                    <option value="Outros">Outros</option>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Valor do Aluguel</label>
                                  <Input name="rentalValue" type="number" defaultValue={vehicle?.fixedCosts?.rentalValue} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Franquia</label>
                                  <Select 
                                    name="franchiseType" 
                                    defaultValue={vehicle?.fixedCosts?.franchiseType || 'unlimited'} 
                                    onChange={e => setModalFranchiseType(e.target.value)}
                                    className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                                  >
                                    <option value="unlimited">KM Livre</option>
                                    <option value="weekly">Franquia Semanal</option>
                                    <option value="monthly">Franquia Mensal</option>
                                  </Select>
                                </div>
                              </div>
                              
                              {modalFranchiseType !== 'unlimited' && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">KM da Franquia</label>
                                    <Input name="franchiseKm" type="number" defaultValue={vehicle?.fixedCosts?.franchiseKm} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Custo KM Excedente</label>
                                    <Input name="excessKmCost" type="number" step="0.01" defaultValue={vehicle?.fixedCosts?.excessKmCost} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {modalFuelType === 'electric' && (
                            <div className="mt-4 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Maint. Bateria (Mensal)</label>
                                  <Input name="batteryMaintenance" type="number" defaultValue={vehicle?.fixedCosts?.batteryMaintenance} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Estação de Carga (Mensal)</label>
                                  <Input name="chargingStation" type="number" defaultValue={vehicle?.fixedCosts?.chargingStation} className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </form>
              </div>

              <div className="p-8 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                <Button 
                  form="vehicle-form"
                  type="submit" 
                  disabled={isSaving}
                  className="w-full h-16 bg-emerald-500 text-zinc-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </div>
                  ) : (editingVehicleId ? "Atualizar Veículo" : "Salvar Veículo")}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleClearData}
        title="Apagar tudo?"
        message="Essa ação é irreversível. Todos os seus ciclos e configurações serão removidos. Tem certeza?"
        confirmText={isDeleting ? 'Apagando...' : 'Confirmar'}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={!!deletingVehicleId}
        onClose={() => setDeletingVehicleId(null)}
        onConfirm={confirmDeleteVehicle}
        title="Excluir Veículo"
        message="Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />
    </motion.div>
  );
};

const SectionHeader = ({ icon: Icon, title }: any) => (
  <div className="flex items-center gap-2 px-1 mb-1 md:mb-2">
    <Icon size={14} className="text-emerald-500" />
    <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-500">{title}</h3>
  </div>
);

const StatCard = ({ icon: Icon, title, value, subtitle, color }: any) => (
  <Card className={cn(
    "border-none shadow-sm rounded-3xl overflow-hidden",
    color === 'emerald' ? "bg-emerald-500/5 border border-emerald-500/10" :
    color === 'blue' ? "bg-blue-500/5 border border-blue-500/10" :
    color === 'amber' ? "bg-amber-500/5 border border-amber-500/10" :
    "bg-red-500/5 border border-red-500/10"
  )}>
    <CardContent className="p-5 space-y-2">
      <div className={cn(
        "flex items-center gap-2",
        color === 'emerald' ? "text-emerald-500" :
        color === 'blue' ? "text-blue-500" :
        color === 'amber' ? "text-amber-500" :
        "text-red-500"
      )}>
        <Icon size={14} />
        <p className="text-[9px] font-black uppercase tracking-widest">{title}</p>
      </div>
      <p className="text-2xl font-black tracking-tighter">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{subtitle}</p>
    </CardContent>
  </Card>
);

const MiniStatCard = ({ title, value, subtitle }: any) => (
  <Card className="border-none bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl">
    <CardContent className="p-4 space-y-1">
      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{title}</p>
      <p className="text-sm font-black">{value}</p>
      {subtitle && <p className="text-[8px] text-zinc-500 font-bold uppercase">{subtitle}</p>}
    </CardContent>
  </Card>
);

const AlertCard = ({ title, count, icon: Icon, color }: any) => (
  <Card className={cn(
    "border-none rounded-2xl",
    color === 'amber' ? "bg-amber-500/5" : "bg-red-500/5"
  )}>
    <CardContent className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center",
          color === 'amber' ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
        )}>
          <Icon size={16} />
        </div>
        <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">{title}</p>
      </div>
      <p className={cn(
        "text-lg font-black",
        color === 'amber' ? "text-amber-500" : "text-red-500"
      )}>{count}</p>
    </CardContent>
  </Card>
);

const CostInput = ({ label, value, onChange, isPrivacyMode }: { label: string, value?: number, onChange: (val: number | undefined) => void, isPrivacyMode?: boolean }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      {!isPrivacyMode && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400 uppercase tracking-widest pointer-events-none">
          R$
        </span>
      )}
      <Input 
        type={isPrivacyMode ? "text" : "number"}
        inputMode="decimal"
        value={isPrivacyMode ? "• • • • •" : (value === undefined ? '' : value)} 
        readOnly={isPrivacyMode}
        onChange={e => {
          if (isPrivacyMode) return;
          const val = e.target.value;
          onChange(val === '' ? undefined : Number(val));
        }}
        className={cn(
          "h-10 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-xl font-bold text-sm transition-all duration-300",
          !isPrivacyMode && "pl-9",
          isPrivacyMode && "tracking-[0.3em] text-zinc-400 dark:text-zinc-500 blur-[0.5px]"
        )}
        placeholder="0,00"
      />
    </div>
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

export default Settings;
