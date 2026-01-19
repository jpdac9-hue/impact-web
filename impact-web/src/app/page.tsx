'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const router = useRouter();

  const categories = [
    { label: 'Tout voir', value: 'All' },
    { label: 'Mode', value: 'Mode' },
    { label: 'Tech', value: 'High-Tech' },
    { label: 'Maison', value: 'Maison' },
    { label: 'Voyage', value: 'Voyage' },
  ];

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    const { data, error } = await supabase.from('Merchant').select('*');
    if (!error) {
      setMerchants(data || []);
      setFilteredMerchants(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    let result = merchants;
    if (selectedCategory !== 'All') {
      result = result.filter(m => m.category === selectedCategory);
    }
    if (searchQuery) {
      result = result.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredMerchants(result);
  }, [searchQuery, selectedCategory, merchants]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* 1. NAVBAR - PROPRE ET FLOTTANTE */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-slate-900 text-white font-bold w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition">I</div>
            <span className="font-bold tracking-tight text-lg">IMPACT.</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/profile" className="hidden sm:block text-sm font-medium text-slate-500 hover:text-slate-900 transition">
              Mon Espace
            </Link>
            <button 
              onClick={() => router.push('/login')}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all active:scale-95"
            >
              Connexion
            </button>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION - GROS TITRE ET IMPACT */}
      <section className="pt-24 pb-20 px-6 text-center max-w-5xl mx-auto">
        
        {/* Badge "Nouveau" */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm mb-8 animate-fade-in-up">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Version Beta 2.0</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-[1.1]">
          Le shopping qui a du <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            sens et de l'impact.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
          Transformez chaque achat en ligne en don pour des causes sociales. 
          Sans dépenser un centime de plus.
        </p>
        
        {/* Barre de recherche "SaaS Style" */}
        <div className="relative max-w-lg mx-auto mb-12 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
          <div className="relative bg-white rounded-xl shadow-xl ring-1 ring-slate-900/5 flex items-center overflow-hidden">
            <div className="pl-4 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
              type="text" 
              placeholder="Rechercher une marque (Nike, Apple...)" 
              className="w-full p-4 outline-none text-slate-900 placeholder:text-slate-400 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                selectedCategory === cat.value 
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 transform scale-105' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* 3. GRILLE DE MARCHANDS */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        {loading ? (
          <div className="flex justify-center items-center py-20 gap-2">
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce delay-100"></div>
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce delay-200"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredMerchants.map((merchant) => (
              <div 
                key={merchant.id} 
                className="group relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-indigo-100 transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                {/* En-tête : Logo et Label */}
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                    {merchant.logo_url ? (
                      <img 
                        src={merchant.logo_url} 
                        alt={merchant.name} 
                        className="w-full h-full object-contain" 
                      />
                    ) : (
                      <span className="text-2xl">⚡️</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                    merchant.reward_type === 'Don' 
                    ? 'bg-rose-50 text-rose-600' 
                    : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {merchant.reward_type === 'Don' ? 'Don Solidaire' : 'Cashback'}
                  </span>
                </div>

                {/* Contenu */}
                <div className="flex-1 mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                    {merchant.name}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">
                    {merchant.offer_text || "Offre activée"}
                  </p>
                </div>

                {/* Bouton */}
                <a 
                  href={merchant.url || merchant.website} 
                  target="_blank"
                  className="w-full flex items-center justify-center gap-2 bg-slate-50 text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-900 hover:text-white transition-all duration-300 group-hover:shadow-lg"
                >
                  Activer l'offre
                  <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </a>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredMerchants.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">😕</div>
            <p className="text-slate-500 font-medium">Oups, aucun marchand trouvé pour cette recherche.</p>
          </div>
        )}
      </section>

      {/* Footer Minimaliste */}
      <footer className="border-t border-slate-200 py-12 text-center text-slate-400 text-sm">
        <p>© 2026 Impact. Tous droits réservés.</p>
      </footer>
    </div>
  );
}