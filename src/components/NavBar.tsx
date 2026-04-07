'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/',          label: 'Accueil',    icon: '🏠' },
  { href: '/search',    label: 'Rechercher', icon: '🔍' },
  { href: '/projects',  label: 'Projets',    icon: '📋' },
  { href: '/watchlist', label: 'Watchlist',  icon: '👁' },
  { href: '/signin',    label: 'Mon Espace', icon: '👤' },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fermer le drawer si on navigue
  useEffect(() => { setOpen(false); }, [pathname]);

  // Bloquer le scroll quand le drawer est ouvert
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Hamburger */}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col gap-1.5 p-2 rounded-xl hover:bg-white/5 transition"
            aria-label="Menu"
          >
            <span className="w-5 h-0.5 bg-white/70 rounded-full" />
            <span className="w-5 h-0.5 bg-white/70 rounded-full" />
            <span className="w-3 h-0.5 bg-white/70 rounded-full" />
          </button>

          {/* Logo centré */}
          <Link href="/" className="flex flex-col items-center absolute left-1/2 -translate-x-1/2">
            <span className="font-black tracking-tight text-lg bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent leading-none">SURIC</span>
            <span className="text-[10px] text-white/30 font-medium leading-none">Scan. Compare. Save.</span>
          </Link>

          {/* Lien page courante à droite */}
          <span className="text-xs text-white/30 font-medium">
            {navLinks.find(l => l.href === pathname)?.icon ?? ''}
          </span>
        </div>
      </nav>

      {/* OVERLAY */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* DRAWER */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-[#0d0d14] border-r border-white/10 z-50 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header drawer */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div>
            <span className="font-black text-xl bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">SURIC</span>
            <p className="text-[10px] text-white/30">Scan. Compare. Save.</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Liens */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navLinks.map(link => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  active
                    ? 'bg-gradient-to-r from-violet-600/30 to-cyan-600/20 text-white border border-violet-500/30'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                {link.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer drawer */}
        <div className="px-6 py-5 border-t border-white/10">
          <p className="text-xs text-white/20 text-center">Suric © 2026</p>
        </div>
      </div>

      {/* BOTTOM NAV MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#0a0a0f]/95 border-t border-white/10 px-6 flex justify-around items-center z-30 h-16">
        {navLinks.slice(0, 4).map(link => {
          const active = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className="flex flex-col items-center gap-1">
              <span className="text-xl">{link.icon}</span>
              <span className={`text-[10px] ${active ? 'text-cyan-400' : 'text-white/40'}`}>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}