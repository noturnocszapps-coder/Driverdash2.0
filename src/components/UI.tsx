import React from 'react';
import { cn } from '../utils';
import { triggerHaptic } from '../lib/haptics';
import { ImpactStyle } from '@capacitor/haptics';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  key?: React.Key;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void | Promise<void>;
}

export const Card = ({ children, className, onClick, ...props }: CardProps) => (
  <div 
    className={cn("bg-[#0B0C10]/60 sm:backdrop-blur-3xl rounded-lg border border-white/5 shadow-premium overflow-hidden transition-all duration-500 w-full max-w-full relative group", className)} 
    onClick={(e) => {
      if (onClick) {
        triggerHaptic(ImpactStyle.Light);
        onClick(e);
      }
    }}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className }: CardProps) => (
  <div className={cn("p-sm md:p-md border-b border-white/5 bg-white/[0.02]", className)}>
    {children}
  </div>
);

export const CardContent = ({ children, className }: CardProps) => (
  <div className={cn("p-md md:p-lg break-words", className)}>
    {children}
  </div>
);

export const Button = ({ 
  children, 
  className, 
  variant = 'primary',
  size = 'md',
  as: Component = 'button',
  loading = false,
  disabled,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  as?: any;
  loading?: boolean;
}) => {
  const variants = {
    primary: 'bg-[#00FFBB] text-zinc-950 hover:bg-[#00e6a9] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,255,187,0.3)]',
    secondary: 'bg-indigo-600 text-white hover:bg-indigo-500 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(79,70,229,0.3)]',
    outline: 'border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold',
    ghost: 'hover:bg-white/5 font-bold text-zinc-400 hover:text-white',
    danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold border border-red-500/20',
  };

  const sizes = {
    sm: 'px-sm py-xs md:px-7 md:py-3 text-[8px] md:text-[9px]',
    md: 'px-md py-sm md:px-9 md:py-4 text-[10px] md:text-[11px]',
    lg: 'px-xl py-md md:px-16 md:py-5 text-xs md:text-sm',
    icon: 'p-sm md:p-md',
  };

  return (
    <Component 
      onClick={(e: any) => {
        triggerHaptic(ImpactStyle.Medium);
        if (props.onClick) props.onClick(e);
      }}
      className={cn(
        "rounded-md font-black transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-sm",
        loading && "cursor-not-allowed opacity-70",
        variants[variant],
        sizes[size as keyof typeof sizes],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </Component>
  );
};

export const Input = ({ className, value, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    className={cn(
      "w-full px-md py-sm rounded-sm border border-white/10 bg-white/5 focus:outline-none focus:ring-4 focus:ring-[#00FFBB]/5 focus:border-[#00FFBB]/30 transition-all font-medium text-white placeholder:text-zinc-600 sm:py-md sm:px-lg",
      className
    )}
    value={value === null ? '' : value}
    {...props}
  />
);

export const Select = ({ className, children, value, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select 
    className={cn(
      "w-full px-md py-sm rounded-sm border border-white/10 bg-white/5 focus:outline-none focus:ring-4 focus:ring-[#00FFBB]/5 focus:border-[#00FFBB]/30 transition-all appearance-none font-medium text-white sm:py-md sm:px-lg",
      className
    )}
    value={value === null ? '' : value}
    {...props}
  >
    {children}
  </select>
);

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuContent = ({ children, className, ...props }: any) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-zinc-950 shadow-md animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Content>
  </DropdownMenuPrimitive.Portal>
);
export const DropdownMenuItem = ({ children, className, ...props }: any) => (
  <DropdownMenuPrimitive.Item
    className={cn(
      "relative flex cursor-default select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none transition-colors focus:bg-zinc-100 focus:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-zinc-800 dark:focus:text-zinc-50",
      className
    )}
    {...props}
  >
    {children}
  </DropdownMenuPrimitive.Item>
);

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800", className)} {...props} />
);

export const PriceDisplay = ({ 
  value, 
  className, 
  prefix = "R$", 
  size = "md" 
}: { 
  value: number; 
  className?: string; 
  prefix?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) => {
  const sizes = {
    sm: 'text-xs md:text-sm',
    md: 'text-base md:text-xl',
    lg: 'text-xl md:text-2xl',
    xl: 'text-2xl md:text-4xl',
  };

  return (
    <div className={cn("flex items-baseline gap-1 font-display font-black italic tracking-tight md:tracking-widest no-wrap", sizes[size], className)}>
      <span className="text-[0.6em] opacity-70 shrink-0">{prefix}</span>
      <span className="tabular-nums">{Math.floor(value).toLocaleString('pt-BR')}</span>
      <span className="text-[0.6em] opacity-70 shrink-0">
        ,{(value % 1).toFixed(2).slice(2)}
      </span>
    </div>
  );
};
