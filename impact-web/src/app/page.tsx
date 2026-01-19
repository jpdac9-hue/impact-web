'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
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
      
      {/* NAVBAR */}
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
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition active:scale-95"
            >
              Connexion
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION COMPACTE */}
      <section className="pt-16 pb-12 px-6 text-center max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Shopping Solidaire.
        </h1>
        <p className="text-lg text-slate-500 mb-8 max-w-2xl mx-auto">
          Activez une offre. Faites un don gratuit. C'est simple.
        </p>
        
        <div className="relative max-w-md mx-auto mb-8">
          <input 
            type="text" 
            placeholder="Rechercher (Nike, Apple...)" 
            className="w-full p-3 pl-10 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 text-slate-400">🔍</span>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                selectedCategory === cat.value 
                ? 'bg-slate-900 text-white' 
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* GRILLE DE MARCHANDS OPTIMISÉE DESKTOP */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        {loading ? (
          <div className="text-center py-20 text-slate-400">Chargement...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredMerchants.map((merchant) => (
              <div 
                key={merchant.id} 
                className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 flex flex-col justify-between"
              >
                {/* LIGNE DU HAUT : LOGO + BOUTON */}
                <div className="flex justify-between items-start mb-4">
                  {/* Logo réduit et contraint */}
                  <div className="w-10 h-10 min-w-[2.5rem] rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-1.5">
                    {merchant.logo_url ? (
                      <img 
                        src={merchant.logo_url} 
                        alt={merchant.name} 
                        className="w-full h-full object-contain" 
                      />
                    ) : (
                      <span className="text-lg">⚡️</span>
                    )}
                  </div>

                  {/* Bouton "Activer" Compact à droite */}
                  <a 
                    href={merchant.url || merchant.website} 
                    target="_blank"
                    className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md hover:bg-indigo-600 transition-colors"
                  >
                    Activer
                  </a>
                </div>

                {/* CONTENU EN DESSOUS */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 leading-tight">
                      {merchant.name}
                    </h3>
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2 h-8">
                    {merchant.offer_text || "Offre partenaire disponible"}
                  </p>

                  {/* Badge Type (Don/Cashback) */}
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded text-[10px] font-semibold text-slate-600">
                    <span className={`w-1.5 h-1.5 rounded-full ${merchant.reward_type === 'Don' ? 'bg-rose-500' : 'bg-indigo-500'}`}></span>
                    {merchant.reward_type === 'Don' ? 'Don Solidaire' : 'Cashback'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}