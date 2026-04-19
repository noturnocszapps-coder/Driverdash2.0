import React from 'react';

export const Footer = () => {
  return (
    <footer className="py-8 px-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 dark:text-zinc-600 text-center">
          Desenvolvido por <a href="https://www.ntaplicacoes.com.br" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 transition-colors">NT APLICAÇÕES</a><br />
          Todos os Direitos Reservados 2026.
        </p>
      </div>
    </footer>
  );
};
