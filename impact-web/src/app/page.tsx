'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import Link from 'next/link'; // Importation cruciale pour la navigation

export default function Home() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Les catégories
  const categories = [
    { label: 'Tous', value: 'All' },
    { label: 'Mode', value: 'Mode' },
    { label: 'Alimentation', value: 'Alimentation' },
    { label: 'High-Tech', value: 'High-Tech' },
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

  // Logique de filtrage (Recherche + Catégorie)
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
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* 1. NAVBAR FIXE */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm py-4 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black text-blue-600 tracking-tighter cursor-pointer">
            <Link href="/">IMPACT.</Link>
          </h1>
          <div className="hidden md:flex space-x-6 font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition">Marchands</Link>
            <Link href="/profile" className="hover:text-blue-600 transition">Mon Impact</Link>
          </div>
          {/* ÉTAPE 2 : BOUTON CONNEXION LIÉ */}
          <Link 
            href="/login" 
            className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-gray-800 transition"
          >
            Connexion
          </Link>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="bg-white py-16 px-8 border-b border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
            Financez des causes <span className="text-blue-600">gratuitement</span> en faisant vos achats.
          </h2>
          
          <div className="relative max-w-2xl mx-auto mt-10">
            <input 
              type="text" 
              placeholder="Rechercher une boutique (Nike, Apple, Amazon...)" 
              className="w-full p-5 pl-12 rounded-2xl border border-gray-200 shadow-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg text-black"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-4 top-5 text-2xl">🔍</span>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition ${
                  selectedCategory === cat.value 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. GRILLE DES MARCHANDS */}
      <section className="max-w-7xl mx-auto py-12 px-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Boutiques partenaires</h3>
            <p className="text-gray-500">{filteredMerchants.length} marchands trouvés</p>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredMerchants.map((merchant) => (
              <div key={merchant.id} className="group bg-white rounded-3xl p-6 border border-gray-100 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-6 border border-gray-50 overflow-hidden group-hover:scale-110 transition-transform">
                  {merchant.logo_url ? (
                    <img src={merchant.logo_url} alt={merchant.name} className="w-10 h-10 object-contain" />
                  ) : (
                    <span className="text-2xl">🏬</span>
                  )}
                </div>

                <h4 className="font-bold text-xl text-gray-900 mb-1">{merchant.name}</h4>
                <p className="text-green-500 font-bold text-lg mb-4">
                  {merchant.offer_text || "Offre disponible"}
                </p>

                <div className="flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <span className={`w-2 h-2 rounded-full ${merchant.reward_type === 'Don' ? 'bg-red-400' : 'bg-blue-400'}`}></span>
                  {merchant.reward_type === 'Don' ? '100% Don Solidaire' : 'Cashback pour vous'}
                </div>

                <a 
                  href={merchant.url || merchant.website} 
                  target="_blank"
                  className="block w-full text-center bg-gray-50 text-gray-900 py-3 rounded-2xl font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors"
                >
                  Activer l'offre
                </a>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredMerchants.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">Aucun marchand ne correspond à votre recherche... 😕</p>
          </div>
        )}
      </section>
    </div>
  );
}