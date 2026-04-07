'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [jackpot, setJackpot] = useState(247.85);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
    // Ferme le menu si on clique ailleurs
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pillars = [
    {
      icon: '🛒',
      title: 'Magasiner',
      description: 'Comparez les prix en temps réel sur Amazon, Walmart, Home Depot et plus. Consultez l\'historique des prix pour savoir si c\'est le bon moment d\'acheter.',
      cta: 'Lancer une recherche',
      href: '/search',
      accent: '#06B6D4',
    },
    {
      icon: '📋',
      title: 'Projets BOM',
      description: 'Créez votre liste de matériaux. Notre algorithme Split-Order calcule automatiquement la combinaison de marchands la moins chère pour votre projet.',
      cta: 'Mes projets',
      href: '/projects',
      accent: '#7C3AED',
    },
    {
      icon: '📷',
      title: 'Scanner',
      description: 'Scannez un code-barres, photographiez un objet ou importez un plan PDF. Notre IA extrait les données et crée votre liste automatiquement.',
      cta: 'Scanner maintenant',
      href: '/scanner',
      accent: '#0891B2',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">

      {/* Blobs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(107,33,168,0.15)' }} />
      <div className="fixed top-20 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(6,182,212,0.1)' }} />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Suric" className="h-15 w-15 rounded-full" />
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-base leading-none" style={{ color: '#06B6D4' }}>SURIC</span>
              <span className="text-[9px] font-bold tracking-widest" style={{ color: '#0891B2' }}>SCAN. COMPARE. SAVE.</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* Menu hamburger avec dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex flex-col gap-1.5 p-2 rounded-xl hover:bg-white/10 transition-all"
              >
                <span className="block w-5 h-0.5 bg-white/60 rounded" />
                <span className="block w-5 h-0.5 bg-white/60 rounded" />
                <span className="block w-5 h-0.5 bg-white/60 rounded" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-52 bg-[#111118] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <Link href="/search" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-sm text-white/80 hover:text-white">
                    <span>🔍</span> Comparer les prix
                  </Link>
                  <Link href="/projects" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-sm text-white/80 hover:text-white">
                    <span>📋</span> Mes projets
                  </Link>
                  <Link href="/watchlist" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-sm text-white/80 hover:text-white">
                    <span>👁️</span> Produits surveillés
                  </Link>
                  <Link href="/scanner" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-sm text-white/80 hover:text-white">
                    <span>📷</span> Scanner
                  </Link>
                  <div className="border-t border-white/10" />
                  <Link href="/jackpot" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-sm text-white/80 hover:text-white">
                    <span>🎯</span> Jackpot Suric
                  </Link>
                  <div className="border-t border-white/10" />
                  {user ? (
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-sm text-white/80 hover:text-white">
                      <span>👤</span> Mon espace
                    </Link>
                  ) : (
                    <button onClick={() => { setMenuOpen(false); router.push('/signin'); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-sm text-white/80 hover:text-white">
                      <span>🔐</span> Connexion
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Engrenage Settings */}
            <Link href="/settings" className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all text-lg">
              ⚙️
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center relative">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-bold mb-6" style={{ color: '#06B6D4' }}>
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Assistant de magasinage • Gratuit
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
          Scan.{' '}
          <span style={{ background: 'linear-gradient(90deg, #7C3AED, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Compare.
          </span>{' '}
          Save.
        </h1>
        <p className="text-white/50 text-lg max-w-2xl mx-auto">
          Trouvez le meilleur prix, suivez l'historique des prix et planifiez vos projets de construction — tout en un.
        </p>
      </section>

      {/* 3 PILIERS */}
      <section className="max-w-6xl mx-auto px-6 pb-24 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => (
            <Link
              key={i}
              href={pillar.href}
              className="group relative bg-white/5 border border-white/10 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col"
              style={{ '--accent': pillar.accent } as any}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = pillar.accent + '60';
                e.currentTarget.style.boxShadow = `0 20px 60px ${pillar.accent}20`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Barre accent en haut */}
              <div className="absolute top-0 left-6 right-6 h-0.5 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: pillar.accent }} />

              {/* Icône */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6" style={{ background: pillar.accent + '20', border: `1px solid ${pillar.accent}30` }}>
                {pillar.icon}
              </div>

              {/* Contenu */}
              <h2 className="text-xl font-black text-white mb-3">{pillar.title}</h2>
              <p className="text-white/40 text-sm leading-relaxed flex-1">{pillar.description}</p>

              {/* CTA */}
              <div className="mt-6 flex items-center gap-2 text-sm font-bold transition-all" style={{ color: pillar.accent }}>
                {pillar.cta}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Jackpot teaser */}
        <div className="mt-8 rounded-3xl p-6 border border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🎯</div>
            <div>
              <p className="font-black text-white">Jackpot Suric</p>
              <p className="text-white/40 text-sm">Jouez chaque semaine et courez la chance de gagner !</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
  <div className="text-right">
    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#FBBF2470' }}>Cumulé</p>
    <p className="text-2xl font-black" style={{ color: '#FBBF24' }}>{jackpot.toFixed(2)} $</p>
  </div>
  <Link href="/jackpot" className="text-sm font-bold px-4 py-2 rounded-xl border border-amber-500/30 text-amber-400 hover:border-amber-400 transition-all">
    Jouer →
  </Link>
</div>
        </div>
      </section>

      {/* BOTTOM TAB BAR MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/10 pt-3 px-6 flex justify-between items-end z-50 h-[80px]">
        <button onClick={() => window.scrollTo(0, 0)} className="flex flex-col items-center gap-1">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold" style={{ color: '#06B6D4' }}>Accueil</span>
        </button>
        <Link href="/search" className="flex flex-col items-center gap-1">
          <span className="text-xl">🔍</span>
          <span className="text-[10px] font-bold text-white/60">Comparer</span>
        </Link>
        <Link href="/jackpot" className="flex flex-col items-center gap-1 -mt-4">
          <div className="w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 border-amber-400/60" style={{ background: 'linear-gradient(135deg, #92400e, #d97706)' }}>
            <span className="text-lg">🎯</span>
            <span className="text-[8px] font-black text-amber-200">{jackpot.toFixed(2)}$</span>
          </div>
          <span className="text-[10px] font-bold text-amber-400 mt-1">Jackpot</span>
        </Link>
        <Link href="/scanner" className="flex flex-col items-center gap-1">
          <span className="text-xl">📷</span>
          <span className="text-[10px] font-bold text-white/60">Scanner</span>
        </Link>
        <Link href="/dashboard" className="flex flex-col items-center gap-1">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-bold text-white/60">Profil</span>
        </Link>
      </div>
    </div>
  );
}