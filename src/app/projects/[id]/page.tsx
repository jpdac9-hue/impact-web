
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import NavBar from '@/src/components/NavBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface BOMItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  status: string;
  bestPrice: string | null;
  bestMerchant: { id: string; name: string; logoUrl: string | null } | null;
  productUrl: string | null;
  productTitle: string | null;
  imageUrl: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  totalMin: string | null;
  bomItems: BOMItem[];
}

interface SplitOrder {
  totalMin: number;
  ordersByMerchant: { merchant: any; items: any[]; subtotal: number }[];
  itemsWithoutPrice: number;
  totalIfSingleMerchant: number | null;
  referenceMerchantName: string | null;
  savings: number | null;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unit: '' });
  const [addingItem, setAddingItem] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [splitOrder, setSplitOrder] = useState<SplitOrder | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [searchingItems, setSearchingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token ?? null;
      setToken(t);
      if (!t) { router.push('/signin'); return; }
      loadProject(t);
    });
  }, [params.id]);
  const loadProject = async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/projects/${params.id}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setProject(data);
    } catch {}
    finally { setLoading(false); }
  };

  const addItem = async () => {
    if (!newItem.name.trim() || !token) return;
    setAddingItem(true);
    try {
      const res = await fetch(`${API_URL}/projects/${params.id}/bom`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItem.name.trim(), quantity: newItem.quantity, unit: newItem.unit || undefined }),
      });
      const data = await res.json();
      setProject(prev => prev ? { ...prev, bomItems: [...prev.bomItems, data] } : prev);
      setNewItem({ name: '', quantity: 1, unit: '' });
      setShowAddForm(false);
    } catch {}
    finally { setAddingItem(false); }
  };

  const deleteItem = async (itemId: string) => {
    if (!token) return;
    await fetch(`${API_URL}/projects/${params.id}/bom/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setProject(prev => prev ? { ...prev, bomItems: prev.bomItems.filter(i => i.id !== itemId) } : prev);
  };

  const calcSplitOrder = async () => {
  if (!token) return;
  setCalculating(true);
  try {
    const res = await fetch(`${API_URL}/projects/${params.id}/bom/split-order`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log('splitOrder response:', JSON.stringify(data));
    setSplitOrder(data);
  } catch (e) { console.error('splitOrder error:', e); }
  finally { setCalculating(false); }
};

  const findBestPrice = async (itemId: string) => {
    if (!token) return;
    setSearchingItems(prev => new Set(prev).add(itemId));
    try {
      const res = await fetch(`${API_URL}/projects/${params.id}/bom/${itemId}/find-price`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = await res.json();
      setProject(prev => {
        if (!prev) return prev;
        const items = prev.bomItems.map(i => i.id === itemId ? { ...i, ...updated } : i);
        return { ...prev, bomItems: items };
      });
    } catch {}
    finally { setSearchingItems(prev => { const s = new Set(prev); s.delete(itemId); return s; }); }
  };

  const openSearch = (itemName: string) => {
    window.open(`/search?q=${encodeURIComponent(itemName)}`, '_blank');
  };

  const statusColors: Record<string, string> = {
    PENDING: 'text-white/40 bg-white/5 border-white/10',
    FOUND: 'text-green-400 bg-green-500/10 border-green-500/20',
    ORDERED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    RECEIVED: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  };

  const statusLabels: Record<string, string> = {
    PENDING: 'En attente', FOUND: 'Prix trouvé', ORDERED: 'Commandé', RECEIVED: 'Reçu',
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!project) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/40">
      Projet introuvable
    </div>
  );

  const itemsWithPrice = project.bomItems.filter(i => i.bestPrice);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans pb-24 md:pb-0">
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* NAVBAR */}
      <NavBar />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header projet */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black mb-1">{project.name}</h1>
              {project.description && <p className="text-white/40 text-sm">{project.description}</p>}
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-white/40">{project.bomItems.length} item{project.bomItems.length !== 1 ? 's' : ''}</span>
                <span className="text-white/40">{itemsWithPrice.length} prix trouvé{itemsWithPrice.length !== 1 ? 's' : ''}</span>
                {(() => {
                  const total = project.bomItems.reduce((sum, i) => sum + (i.bestPrice ? Number(i.bestPrice) * i.quantity : 0), 0);
                  return total > 0 ? (
                    <span className="text-cyan-400 font-black">Total estimé: {total.toFixed(2)} $</span>
                  ) : null;
                })()}
              </div>
            </div>
            <div className="flex gap-2">
              {itemsWithPrice.length > 0 && (
                <button
                  onClick={calcSplitOrder}
                  disabled={calculating}
                  className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
                >
                  {calculating ? '...' : '⚡ Split-Order'}
                </button>
              )}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
              >
                + Ajouter
              </button>
            </div>
          </div>
        </div>

{/* Split-Order résultats */}
{splitOrder && (
  <div className="bg-white/5 border border-violet-500/30 rounded-3xl p-6 mb-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚡</span>
        <div>
          <h2 className="font-black text-white text-lg">Split-Order Optimal</h2>
          <p className="text-xs text-white/40">Meilleur prix pour chaque item, réparti par marchand</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-black text-cyan-400">{Number(splitOrder.totalMin ?? 0).toFixed(2)} $</p>
        <p className="text-xs text-white/30">Prix optimisé par marchand</p>
      </div>
    </div>

    <div className="space-y-4">
      {splitOrder.ordersByMerchant.map((order: any, i: number) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {/* Header marchand */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏪</span>
              <span className="font-black text-white">{order.merchant?.name ?? 'Autre marchand'}</span>
              <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                {order.items.length} item{order.items.length > 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-lg font-black text-cyan-400">{order.subtotal.toFixed(2)} $</span>
          </div>

          {/* Liste des items */}
          <div className="px-4 py-2 space-y-2">
            {order.items.map((item: any, j: number) => (
              <div key={j} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded-lg object-contain bg-white p-0.5" />
                  )}
                  <div>
                    <p className="text-sm text-white/80 font-medium">{item.name}</p>
                    <p className="text-xs text-white/30">{item.quantity} × {Number(item.bestPrice).toFixed(2)} $</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{item.lineTotal.toFixed(2)} $</p>
                  {item.productUrl && (
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (token) {
                          fetch(`${API_URL}/search/affiliate-click`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ merchantId: item.bestMerchantId, productTitle: item.productTitle, productUrl: item.productUrl }),
                          }).catch(() => {});
                        }
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      Voir →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bouton commander */}
          <div className="px-4 pb-3">
            {order.items[0]?.productUrl ? (
              <a
                href={order.items[0].productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
              >
                🛒 Commander chez {order.merchant?.name ?? 'ce marchand'}
              </a>
            ) : (
              <div className="text-center text-xs text-white/20 py-1">Lien non disponible</div>
            )}
          </div>
        </div>
      ))}

      {splitOrder.itemsWithoutPrice > 0 && (
        <p className="text-xs text-amber-400 text-center">
          ⚠ {splitOrder.itemsWithoutPrice} item{splitOrder.itemsWithoutPrice > 1 ? 's' : ''} sans prix — cliquez sur "Chercher" pour les inclure
        </p>
      )}
    </div>
  </div>
)}

        {/* Formulaire ajout item */}
        {showAddForm && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
            <h2 className="font-black mb-4">Ajouter un matériau</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Nom (ex: Lumber 2x4 8 pieds)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm"
                value={newItem.name}
                onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addItem()}
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  min={1}
                  placeholder="Qté"
                  className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm"
                  value={newItem.quantity}
                  onChange={e => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                />
                <input
                  type="text"
                  placeholder="Unité (ex: pcs, pi, kg)"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm"
                  value={newItem.unit}
                  onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={addItem}
                  disabled={addingItem || !newItem.name.trim()}
                  className="bg-gradient-to-r from-violet-600 to-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold text-sm"
                >
                  {addingItem ? 'Ajout...' : 'Ajouter'}
                </button>
                <button onClick={() => setShowAddForm(false)} className="text-white/40 hover:text-white text-sm px-4">Annuler</button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des items BOM */}
        {project.bomItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-20">📦</div>
            <p className="text-white/30 mb-2">Aucun matériau dans ce projet</p>
            <p className="text-white/20 text-sm">Ajoutez des matériaux pour commencer à comparer les prix</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {project.bomItems.map(item => (
              <div key={item.id} className="group bg-white/5 border border-white/10 hover:border-violet-500/20 rounded-2xl p-4 flex items-center gap-4 transition-all">
                {/* Quantité */}
                <div className="w-12 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider mb-0.5">Qté</span>
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <span className="font-black text-lg">{item.quantity}</span>
                  </div>
                  {item.unit && <span className="text-[9px] text-white/30 mt-0.5">{item.unit}</span>}
                </div>

                {/* Info — cliquable pour ouvrir la recherche */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => openSearch(item.name)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold truncate hover:text-cyan-400 transition-colors">{item.name}</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColors[item.status]}`}>
                      {statusLabels[item.status]}
                    </span>
                  </div>
                  {item.bestPrice && (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm text-cyan-400 font-bold">
                        {Number(item.bestPrice).toFixed(2)} $ / unité
                        {item.quantity > 1 && (
                          <span className="text-white/60 font-normal ml-2">
                            = {(Number(item.bestPrice) * item.quantity).toFixed(2)} $ total
                          </span>
                        )}
                      </p>
                      {(item.bestMerchant || item.description) && (
  <p className="text-xs text-white/40">
    🏪 {item.bestMerchant?.name ?? item.description}
  </p>
)}
                    </div>
                  )}
                  {item.productTitle && <p className="text-xs text-white/30 truncate mt-0.5">{item.productTitle}</p>}
                </div>

                {/* Image du produit */}
                {item.imageUrl && (
                  <div className="w-16 h-16 rounded-xl bg-white overflow-hidden flex items-center justify-center flex-shrink-0 p-1">
                    <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  {item.productUrl && (
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => fetch(`${API_URL}/search/affiliate-click`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productTitle: item.name, productUrl: item.productUrl }) }).catch(() => {})}
                      className="text-xs font-bold text-green-400 hover:text-green-300 px-3 py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 transition-all min-w-[90px] text-center"
                    >
                      🛒 Acheter
                    </a>
                  )}
                  <button
                    onClick={() => findBestPrice(item.id)}
                    disabled={searchingItems.has(item.id)}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 transition-all min-w-[90px] text-center"
                  >
                    {searchingItems.has(item.id) ? '🔄 ...' : '🔍 Chercher'}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/20 flex items-center justify-center transition-all text-sm"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM NAV MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#0a0a0f]/95 border-t border-white/10 px-6 flex justify-around items-center z-50 h-16">
        <Link href="/" className="flex flex-col items-center gap-1"><span className="text-xl">🏠</span><span className="text-[10px] text-white/40">Accueil</span></Link>
        <Link href="/search" className="flex flex-col items-center gap-1"><span className="text-xl">🔍</span><span className="text-[10px] text-white/40">Chercher</span></Link>
        <Link href="/projects" className="flex flex-col items-center gap-1"><span className="text-xl">📋</span><span className="text-[10px] text-cyan-400">Projets</span></Link>
        <Link href="/signin" className="flex flex-col items-center gap-1"><span className="text-xl">👤</span><span className="text-[10px] text-white/40">Profil</span></Link>
      </div>
    </div>
  );
}