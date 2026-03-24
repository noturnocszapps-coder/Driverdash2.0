import React from 'react';

export const Footer = () => {
  return (
    <footer className="py-8 px-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-300 dark:text-zinc-800">
          © 2026 DriverDash.
        </p>
      </div>
    </footer>
  );
};
