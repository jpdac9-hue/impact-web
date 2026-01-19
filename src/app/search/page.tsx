'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setHasSearched(true);
    setResults([]);

    try {
      // Appel à NOTRE api sécurisée (pas directement SerpApi)
      const res = await fetch(`/api/compare?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data.products) {
        setResults(data.products);
      }
    } catch (error) {
      console.error("Erreur de recherche:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      
      {/* HEADER MOBILE & DESKTOP */}
      <div className="bg-white p-4 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
        <h1 className="text-xl font-black tracking-tighter mb-3 md:text-2xl">Comparateur de Prix 🇨🇦</h1>
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
          <input
            type="text"
            placeholder="Produit (ex: iPhone 15, Lego Star Wars...)"
            className="w-full bg-slate-100 p-3 pl-10 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-600 transition"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 text-slate-400">🔍</span>
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-600 transition disabled:opacity-50"
          >
            {loading ? '...' : 'GO'}
          </button>
        </form>
      </div>

      {/* RÉSULTATS */}
      <div className="max-w-4xl mx-auto p-4">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p className="mt-2 text-sm text-slate-500 font-medium">Recherche des meilleurs prix...</p>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
           <div className="text-center py-10 text-slate-400">Aucun résultat trouvé pour "{query}".</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map((product, index) => (
            <div key={index} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex gap-3 items-start">
              {/* Image */}
              <div className="w-24 h-24 bg-white rounded-lg flex-shrink-0 overflow-hidden border border-slate-100 p-1 flex items-center justify-center">
                <img src={product.image} alt={product.title} className="max-w-full max-h-full object-contain" />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-24">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                     <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 rounded uppercase truncate max-w-[100px]">
                       {product.source}
                     </span>
                     {product.rating && (
                       <span className="text-[10px] text-yellow-500 font-bold">★ {product.rating}</span>
                     )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs leading-tight line-clamp-2 mb-1">
                    {product.title}
                  </h3>
                </div>
                
                <div className="flex items-end justify-between">
                  <div className="text-lg font-black text-indigo-600">{product.price}</div>
                  <a 
                    href={product.link} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition"
                  >
                    Voir l'offre
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NAVIGATION DU BAS (Identique à l'accueil) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-between items-end z-50 h-[80px]">
        <Link href="/" className="flex flex-col items-center gap-1 p-2 w-16 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition">
          <span className="text-2xl">🏠</span>
          <span className="text-[10px] font-bold">Accueil</span>
        </Link>
        
        {/* L'onglet actif est coloré */}
        <div className="flex flex-col items-center gap-1 p-2 w-16 text-indigo-600">
          <span className="text-2xl">🔍</span>
          <span className="text-[10px] font-bold">Chercher</span>
        </div>

        <Link href="/dashboard" className="flex flex-col items-center gap-1 p-2 w-16 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition">
          <span className="text-2xl">👤</span>
          <span className="text-[10px] font-bold">Profil</span>
        </Link>
      </div>
    </div>
  );
}