
import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Scissors, 
  Users, 
  Layers, 
  Plus, 
  ChevronRight, 
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  LogOut,
  Trash2,
  Edit2
} from 'lucide-react';

import { db } from './lib/db';
import { BRAND } from './lib/brand';
import { 
  ProductionOrder, 
  ProductReference, 
  Seamstress, 
  Fabric, 
  OrderStatus, 
  ProductionOrderItem,
  OrderSplit
} from './types';

// Components
import { Login } from './components/Login';
import { StatCard } from './components/StatCard';
import { OrderModal } from './components/OrderModal';
import { ProductModal } from './components/ProductModal';
import { SeamstressModal } from './components/SeamstressModal';
import { FabricModal } from './components/FabricModal';
import { CutConfirmationModal } from './components/CutConfirmationModal';
import { DistributeModal } from './components/DistributeModal';
import { generateProductionInsights } from './services/geminiService';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('kavins_session'));
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [products, setProducts] = useState<ProductReference[]>([]);
  const [seamstresses, setSeamstresses] = useState<Seamstress[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  
  // UI State
  const [activeModal, setActiveModal] = useState<'order' | 'product' | 'seamstress' | 'fabric' | 'cut' | 'distribute' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  // Load Initial Data
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [o, p, s, f] = await Promise.all([
        db.orders.getAll(),
        db.products.getAll(),
        db.seamstresses.getAll(),
        db.fabrics.getAll()
      ]);
      setOrders(o || []);
      setProducts(p || []);
      setSeamstresses(s || []);
      setFabrics(f || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // Configuração dinâmica do botão do Header
  const headerButtonConfig = useMemo(() => {
    switch(location.pathname) {
      case '/produtos': 
        return { label: 'Novo Produto', modal: 'product' as const };
      case '/costureiras': 
        return { label: 'Nova Costureira', modal: 'seamstress' as const };
      case '/estoque': 
        return { label: 'Nova Entrada', modal: 'fabric' as const };
      case '/pedidos':
      default: 
        return { label: 'Novo Corte', modal: 'order' as const };
    }
  }, [location.pathname]);

  // --- HANDLERS ---

  const handleCreateOrder = async (orderData: Omit<ProductionOrder, 'updatedAt'>) => {
    try {
      const timestamp = new Date().toISOString();
      const existing = orders.find(o => o.id === orderData.id);
      
      if (existing) {
        const updated = { ...orderData, updatedAt: timestamp } as ProductionOrder;
        await db.orders.update(updated);
        setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      } else {
        const newItem = { ...orderData, updatedAt: timestamp } as ProductionOrder;
        await db.orders.create(newItem);
        setOrders(prev => [newItem, ...prev]);
      }
    } catch (err: any) {
      alert(`Erro ao salvar pedido: ${err.message}`);
    }
  };

  const handleConfirmCut = async (updatedItems: ProductionOrderItem[], activeItems: ProductionOrderItem[]) => {
    if (!selectedItem) return;
    try {
      const updatedOrder: ProductionOrder = {
        ...selectedItem,
        items: updatedItems,
        activeCuttingItems: activeItems,
        status: OrderStatus.CUTTING,
        updatedAt: new Date().toISOString()
      };
      await db.orders.update(updatedOrder);
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      setActiveModal(null);
    } catch (err: any) {
      alert(`Erro ao confirmar corte: ${err.message}`);
    }
  };

  const handleDistribute = async (orderId: string, distributionMap: any[], seamstressId: string) => {
    const order = orders.find(o => o.id === orderId);
    const seamstress = seamstresses.find(s => s.id === seamstressId);
    if (!order || !seamstress) return;

    try {
      const newSplit: OrderSplit = {
        id: crypto.randomUUID(),
        seamstressId: seamstress.id,
        seamstressName: seamstress.name,
        status: OrderStatus.SEWING,
        items: distributionMap.map(d => ({
          color: d.color,
          actualPieces: Object.values(d.sizes).reduce((a: any, b: any) => a + b, 0) as number,
          sizes: d.sizes,
          rollsUsed: 0, piecesPerSizeEst: 0, estimatedPieces: 0
        })),
        createdAt: new Date().toISOString()
      };

      const newActiveItems = order.activeCuttingItems.map(item => {
        const distItem = distributionMap.find(d => d.color === item.color);
        if (!distItem) return item;

        const newSizes = { ...item.sizes };
        Object.keys(distItem.sizes).forEach(size => {
          newSizes[size] = (newSizes[size] || 0) - distItem.sizes[size];
        });

        return {
          ...item,
          sizes: newSizes,
          actualPieces: Object.values(newSizes).reduce((a: any, b: any) => a + b, 0) as number
        };
      });

      const updatedOrder: ProductionOrder = {
        ...order,
        activeCuttingItems: newActiveItems.filter(i => i.actualPieces > 0),
        splits: [...(order.splits || []), newSplit],
        status: OrderStatus.SEWING,
        updatedAt: new Date().toISOString()
      };

      await db.orders.update(updatedOrder);
      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
    } catch (err: any) {
      alert("Erro ao distribuir: " + err.message);
    }
  };

  const handleDelete = async (table: string, id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return;
    try {
      const response = await fetch(`/corte/api/${table}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Erro ao excluir");
      
      if (table === 'orders') setOrders(prev => prev.filter(o => o.id !== id));
      if (table === 'products') setProducts(prev => prev.filter(p => p.id !== id));
      if (table === 'fabrics') setFabrics(prev => prev.filter(f => f.id !== id));
      if (table === 'seamstresses') setSeamstresses(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getAiInsights = async () => {
    setIsGeneratingAi(true);
    const text = await generateProductionInsights(orders, seamstresses);
    setAiInsights(text);
    setIsGeneratingAi(false);
  };

  if (!isAuthenticated) return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-indigo-950 text-white flex-col sticky top-0 h-screen shadow-xl">
        <div className="p-6 border-b border-indigo-900/50">
          <h1 className="text-2xl font-black tracking-tighter">{BRAND.companyName}</h1>
          <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">{BRAND.appName}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/' ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:bg-indigo-900/50'}`}>
            <LayoutDashboard size={20} /> Painel
          </Link>
          <Link to="/pedidos" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/pedidos' ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:bg-indigo-900/50'}`}>
            <Scissors size={20} /> Ordens de Corte
          </Link>
          <Link to="/produtos" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/produtos' ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:bg-indigo-900/50'}`}>
            <Package size={20} /> Produtos
          </Link>
          <Link to="/costureiras" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/costureiras' ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:bg-indigo-900/50'}`}>
            <Users size={20} /> Costureiras
          </Link>
          <Link to="/estoque" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/estoque' ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:bg-indigo-900/50'}`}>
            <Layers size={20} /> Tecidos
          </Link>
        </nav>
        <div className="p-4 border-t border-indigo-900/50">
          <button onClick={() => { localStorage.removeItem('kavins_session'); setIsAuthenticated(false); }} className="flex items-center gap-3 px-4 py-2 w-full text-indigo-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-all">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
             <h2 className="text-lg font-bold text-slate-800">
               {location.pathname === '/' ? 'Dashboard' : 
                location.pathname === '/pedidos' ? 'Gestão de Cortes' :
                location.pathname === '/produtos' ? 'Produtos & Referências' :
                location.pathname === '/costureiras' ? 'Equipe de Costura' : 'Estoque de Tecidos'}
             </h2>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => { setSelectedItem(null); setActiveModal(headerButtonConfig.modal); }} 
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
             >
               <Plus size={18}/> {headerButtonConfig.label}
             </button>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard orders={orders} seamstresses={seamstresses} getAiInsights={getAiInsights} aiInsights={aiInsights} isGeneratingAi={isGeneratingAi} />} />
            <Route path="/pedidos" element={<OrdersList orders={orders} onEdit={(o) => { setSelectedItem(o); setActiveModal('order'); }} onConfirmCut={(o) => { setSelectedItem(o); setActiveModal('cut'); }} onDistribute={(o) => { setSelectedItem(o); setActiveModal('distribute'); }} onDelete={(id) => handleDelete('orders', id)} />} />
            <Route path="/produtos" element={<ProductsList products={products} onEdit={(p) => { setSelectedItem(p); setActiveModal('product'); }} onAdd={() => { setSelectedItem(null); setActiveModal('product'); }} onDelete={(id) => handleDelete('products', id)} />} />
            <Route path="/costureiras" element={<SeamstressesList seamstresses={seamstresses} onEdit={(s) => { setSelectedItem(s); setActiveModal('seamstress'); }} onAdd={() => { setSelectedItem(null); setActiveModal('seamstress'); }} onDelete={(id) => handleDelete('seamstresses', id)} />} />
            <Route path="/estoque" element={<FabricsList fabrics={fabrics} onEdit={(f) => { setSelectedItem(f); setActiveModal('fabric'); }} onAdd={() => { setSelectedItem(null); setActiveModal('fabric'); }} onDelete={(id) => handleDelete('fabrics', id)} />} />
          </Routes>
        </div>
      </main>

      {/* Modals */}
      <OrderModal 
        isOpen={activeModal === 'order'} 
        onClose={() => setActiveModal(null)} 
        references={products} 
        orderToEdit={selectedItem} 
        onSave={handleCreateOrder} 
        suggestedId={orders.length > 0 ? (Math.max(...orders.map(o => parseInt(o.id) || 0)) + 1).toString() : "1001"}
      />
      <ProductModal 
        isOpen={activeModal === 'product'} 
        onClose={() => setActiveModal(null)} 
        productToEdit={selectedItem} 
        onSave={(p) => {
           if ('id' in p) db.products.update(p as ProductReference).then(loadAllData);
           else db.products.create({ ...p, id: crypto.randomUUID() } as ProductReference).then(loadAllData);
        }}
        fabrics={fabrics}
      />
      <SeamstressModal
        isOpen={activeModal === 'seamstress'}
        onClose={() => setActiveModal(null)}
        seamstressToEdit={selectedItem}
        onSave={(s) => {
          if ('id' in s) db.seamstresses.update(s as Seamstress).then(loadAllData);
          else db.seamstresses.create({ ...s, id: crypto.randomUUID() } as Seamstress).then(loadAllData);
        }}
      />
      <FabricModal
        isOpen={activeModal === 'fabric'}
        onClose={() => setActiveModal(null)}
        fabricToEdit={selectedItem}
        onSave={(f) => {
          if ('id' in f) db.fabrics.update(f as Fabric).then(loadAllData);
          else db.fabrics.create({ ...f, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Fabric).then(loadAllData);
        }}
      />
      <CutConfirmationModal
        isOpen={activeModal === 'cut'}
        onClose={() => setActiveModal(null)}
        order={selectedItem}
        onConfirm={handleConfirmCut}
      />
      <DistributeModal
        isOpen={activeModal === 'distribute'}
        onClose={() => setActiveModal(null)}
        order={selectedItem}
        seamstresses={seamstresses}
        onDistribute={handleDistribute}
      />
    </div>
  );
}

// --- SUB-COMPONENTS (Pages) ---

function Dashboard({ orders, seamstresses, getAiInsights, aiInsights, isGeneratingAi }: any) {
  const stats = useMemo(() => ({
    total: orders.length,
    cutting: orders.filter((o: any) => o.status === OrderStatus.CUTTING).length,
    sewing: orders.filter((o: any) => o.status === OrderStatus.SEWING).length,
    pieces: orders.reduce((acc: number, o: any) => acc + o.items.reduce((sum: number, i: any) => sum + (i.actualPieces || 0), 0), 0)
  }), [orders]);

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Total de Ordens" value={stats.total} icon={Package} color="bg-indigo-500" />
        <StatCard title="Em Corte" value={stats.cutting} icon={Scissors} color="bg-purple-500" />
        <StatCard title="Na Costura" value={stats.sewing} icon={Users} color="bg-amber-500" />
        <StatCard title="Peças Produzidas" value={stats.pieces} icon={CheckCircle2} color="bg-emerald-500" />
      </div>

      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <Sparkles className="text-indigo-600" size={24}/> AI Production Insights
           </h3>
           <button 
             onClick={getAiInsights}
             disabled={isGeneratingAi}
             className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all disabled:opacity-50"
           >
             {isGeneratingAi ? 'Analisando...' : 'Gerar Novo Relatório'}
           </button>
        </div>
        
        {aiInsights ? (
          <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line">
            {aiInsights}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
             <p className="text-slate-400 font-medium">Clique no botão acima para analisar gargalos e produtividade via IA.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OrdersList({ orders, onEdit, onConfirmCut, onDistribute, onDelete }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Ref/ID</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Tecido/Peças</th>
              <th className="px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order: ProductionOrder) => (
              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{order.referenceCode}</div>
                  <div className="text-[10px] font-mono text-slate-400">#{order.id}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    order.status === OrderStatus.PLANNED ? 'bg-slate-100 text-slate-500' :
                    order.status === OrderStatus.CUTTING ? 'bg-purple-100 text-purple-600' :
                    order.status === OrderStatus.SEWING ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                   <div className="text-sm font-medium text-slate-700">{order.fabric}</div>
                   <div className="text-xs text-slate-400">
                     {order.items.reduce((acc, i) => acc + (i.actualPieces || 0), 0)} peças confirmadas
                   </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {order.status === OrderStatus.PLANNED && (
                      <button onClick={() => onConfirmCut(order)} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all">
                        <Scissors size={18} />
                      </button>
                    )}
                    {order.status === OrderStatus.CUTTING && order.activeCuttingItems.length > 0 && (
                      <button onClick={() => onDistribute(order)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all">
                        <Users size={18} />
                      </button>
                    )}
                    <button onClick={() => onEdit(order)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => onDelete(order.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductsList({ products, onEdit, onDelete }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((p: any) => (
        <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{p.code}</h3>
              <p className="text-sm text-slate-500">{p.description}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onEdit(p)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={18}/></button>
              <button onClick={() => onDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18}/></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.defaultColors?.map((c: any, i: number) => (
              <span key={i} className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-bold">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: c.hex}}></div> {c.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SeamstressesList({ seamstresses, onEdit, onDelete }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {seamstresses.map((s: any) => (
        <div key={s.id} className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">{s.name.charAt(0)}</div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800">{s.name}</h3>
            <p className="text-xs text-slate-500">{s.specialty}</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(s)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={18}/></button>
            <button onClick={() => onDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18}/></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FabricsList({ fabrics, onEdit, onDelete }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {fabrics.map((f: any) => (
        <div key={f.id} className="bg-white p-6 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg border border-slate-100 shadow-inner" style={{backgroundColor: f.colorHex}}></div>
            <div>
              <h3 className="font-bold text-slate-800">{f.name}</h3>
              <p className="text-xs text-slate-500">{f.color}</p>
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-slate-50">
            <span className="text-sm font-bold text-slate-400">Estoque: <strong className="text-indigo-600">{f.stockRolls} rolos</strong></span>
            <div className="flex gap-1">
              <button onClick={() => onEdit(f)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={18}/></button>
              <button onClick={() => onDelete(f.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18}/></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
