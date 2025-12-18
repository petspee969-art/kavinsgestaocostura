
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Scissors, Users, Plus, Search, CheckCircle2, Shirt, Tags, Trash2, ArrowRightLeft, 
  ChevronDown, ChevronUp, Edit2, PackageCheck, ClipboardList, Archive, CalendarDays, TrendingUp, 
  FileText, Clock, Loader2, Printer, Layers, LogOut, Menu, X, Filter
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

import { db } from './lib/db';
import { BRAND, updateDocumentTitle } from './lib/brand';
import { Login } from './components/Login';
import { StatCard } from './components/StatCard';
import { OrderModal } from './components/OrderModal';
import { ProductModal } from './components/ProductModal';
import { CutConfirmationModal } from './components/CutConfirmationModal';
import { DistributeModal } from './components/DistributeModal';
import { SeamstressModal } from './components/SeamstressModal';
import { FabricModal } from './components/FabricModal';
import { generateProductionInsights } from './services/geminiService';
import { ProductionOrder, Seamstress, OrderStatus, ProductReference, Fabric } from './types';

export default function App() {
  // AUTH & GLOBAL STATE
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'production' | 'seamstresses' | 'products' | 'fabrics'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // DATA STATE
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [seamstresses, setSeamstresses] = useState<Seamstress[]>([]);
  const [references, setReferences] = useState<ProductReference[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  
  // UI LOGIC STATE
  const [productionStage, setProductionStage] = useState<OrderStatus>(OrderStatus.PLANNED);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  
  // MODAL STATES
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSeamstressModalOpen, setIsSeamstressModalOpen] = useState(false);
  const [isFabricModalOpen, setIsFabricModalOpen] = useState(false);
  const [cuttingOrder, setCuttingOrder] = useState<ProductionOrder | null>(null);
  const [distributingOrder, setDistributingOrder] = useState<ProductionOrder | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductReference | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<ProductionOrder | null>(null);
  const [seamstressToEdit, setSeamstressToEdit] = useState<Seamstress | null>(null);
  const [fabricToEdit, setFabricToEdit] = useState<Fabric | null>(null);

  // AUTH SESSION CHECK
  useEffect(() => {
    const session = localStorage.getItem('app_session');
    if (session === 'true') setIsAuthenticated(true);
    setAuthChecking(false);
    updateDocumentTitle();
  }, []);

  const handleLoginSuccess = () => {
    localStorage.setItem('app_session', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('app_session');
    setIsAuthenticated(false);
  };

  // DATA FETCHING
  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prod, seam, ord, fab] = await Promise.all([
        db.products.getAll(),
        db.seamstresses.getAll(),
        db.orders.getAll(),
        db.fabrics.getAll()
      ]);
      setReferences(prod);
      setSeamstresses(seam);
      setOrders(ord);
      setFabrics(fab);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // DASHBOARD METRICS
  const metrics = useMemo(() => {
    const now = new Date();
    const planned = orders.filter(o => o.status === OrderStatus.PLANNED).length;
    const cutting = orders.filter(o => o.status === OrderStatus.CUTTING).length;
    const activeSeamstresses = new Set(orders.flatMap(o => (o.splits || []).filter(s => s.status === OrderStatus.SEWING).map(s => s.seamstressId))).size;
    
    let monthPieces = 0;
    orders.forEach(o => {
        (o.splits || []).forEach(s => {
            if (s.status === OrderStatus.FINISHED && s.finishedAt) {
                const fDate = new Date(s.finishedAt);
                if (fDate.getMonth() === now.getMonth() && fDate.getFullYear() === now.getFullYear()) {
                    monthPieces += s.items.reduce((acc, i) => acc + i.actualPieces, 0);
                }
            }
        });
    });

    const weeklyData = Array.from({length: 7}, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const day = d.toLocaleDateString('pt-BR', { day: '2-digit' });
        let val = 0;
        orders.forEach(o => o.splits?.forEach(s => {
            if(s.status === OrderStatus.FINISHED && s.finishedAt && new Date(s.finishedAt).toDateString() === d.toDateString()) {
                val += s.items.reduce((acc, item) => acc + item.actualPieces, 0);
            }
        }));
        return { name: day, peças: val };
    });

    return { planned, cutting, activeSeamstresses, monthPieces, weeklyData };
  }, [orders]);

  // FILTERED DATA
  const filteredOrders = useMemo(() => orders.filter(o => 
    (o.referenceCode.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm)) &&
    o.status === productionStage
  ), [orders, searchTerm, productionStage]);

  // HANDLERS
  const handleCreateOrder = async (data: any) => {
    const order = { ...data, updatedAt: new Date().toISOString() };
    if (orders.some(o => o.id === order.id)) {
        await db.orders.update(order);
        setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    } else {
        await db.orders.create(order);
        setOrders(prev => [order, ...prev]);
    }
  };

  // Added handleSaveFabric to fix "Cannot find name 'handleSaveFabric'" error
  const handleSaveFabric = async (fabric: any) => {
    const timestamp = new Date().toISOString();
    if (fabric.id) {
        const updated = { ...fabric, updatedAt: timestamp };
        await db.fabrics.update(updated);
        setFabrics(prev => prev.map(f => f.id === fabric.id ? updated : f));
    } else {
        const newFabric = { ...fabric, id: Math.random().toString(36).substr(2, 9), createdAt: timestamp, updatedAt: timestamp };
        await db.fabrics.create(newFabric);
        setFabrics(prev => [...prev, newFabric]);
    }
  };

  // Added handleSaveProduct to support ProductModal
  const handleSaveProduct = async (product: any) => {
    if (product.id) {
        await db.products.update(product);
        setReferences(prev => prev.map(r => r.id === product.id ? product : r));
    } else {
        const newProduct = { ...product, id: Math.random().toString(36).substr(2, 9) };
        await db.products.create(newProduct);
        setReferences(prev => [...prev, newProduct]);
    }
  };

  // Added handleSaveSeamstress to support SeamstressModal
  const handleSaveSeamstress = async (seamstress: any) => {
    if (seamstress.id) {
        await db.seamstresses.update(seamstress);
        setSeamstresses(prev => prev.map(s => s.id === seamstress.id ? seamstress : s));
    } else {
        const newSeamstress = { ...seamstress, id: Math.random().toString(36).substr(2, 9) };
        await db.seamstresses.create(newSeamstress);
        setSeamstresses(prev => [...prev, newSeamstress]);
    }
  };

  // Added handleConfirmCut to support CutConfirmationModal
  const handleConfirmCut = async (updatedTotalItems: any, activeItems: any) => {
    if (!cuttingOrder) return;
    const updatedAt = new Date().toISOString();
    const updatedOrder = { 
        ...cuttingOrder, 
        items: updatedTotalItems, 
        activeCuttingItems: activeItems, 
        status: OrderStatus.CUTTING, // Move to cutting stage explicitly
        updatedAt 
    };
    await db.orders.update(updatedOrder);
    setOrders(prev => prev.map(o => o.id === cuttingOrder.id ? updatedOrder : o));
    setCuttingOrder(null);
  };

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    updateDocumentTitle(tab.charAt(0).toUpperCase() + tab.slice(1));
  };

  if (authChecking) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;
  if (!isAuthenticated) return <Login onLoginSuccess={handleLoginSuccess} />;
  if (isLoading) return <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4"><Loader2 className="animate-spin text-indigo-600" size={32} /><p className="font-bold text-slate-500">Sincronizando {BRAND.companyName}...</p></div>;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      
      {/* MOBILE TOP BAR */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-indigo-950 text-white z-40 h-14 px-4 flex items-center justify-between shadow-lg">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2"><Menu size={24} /></button>
        <h1 className="font-bold text-lg tracking-tight">{BRAND.shortName}</h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      {/* RESPONSIVE SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-indigo-950 text-white flex flex-col shadow-2xl transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-white/10 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">{BRAND.companyName}</h1>
            <p className="text-[10px] uppercase tracking-widest text-indigo-400 mt-1">{BRAND.appName}</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-indigo-300"><X size={24} /></button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'production', icon: Scissors, label: 'Produção' },
            { id: 'fabrics', icon: Layers, label: 'Tecidos' },
            { id: 'products', icon: Tags, label: 'Catálogo' },
            { id: 'seamstresses', icon: Users, label: 'Equipe' },
          ].map(item => (
            <button 
                key={item.id} 
                onClick={() => handleTabChange(item.id as any)} 
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-200 hover:bg-white/5'}`}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-2 text-indigo-400 hover:text-white w-full px-4 py-3 rounded-lg hover:bg-red-500/10 transition-colors">
            <LogOut size={18} /> <span className="font-bold">Sair</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 relative scroll-smooth">
        
        {/* DESKTOP HEADER */}
        <div className="hidden md:flex sticky top-0 bg-white/80 backdrop-blur-md z-30 border-b px-8 py-5 justify-between items-center">
          <h2 className="text-2xl font-black text-slate-800 capitalize">{activeTab}</h2>
          <div className="flex gap-4">
            {activeTab === 'production' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Pesquisar..." className="pl-10 pr-4 py-2 rounded-full border border-slate-200 bg-slate-50 w-64 focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            )}
            <button onClick={() => {
                if(activeTab === 'production') { setOrderToEdit(null); setIsOrderModalOpen(true); }
                if(activeTab === 'products') { setEditingProduct(null); setIsProductModalOpen(true); }
                if(activeTab === 'fabrics') { setFabricToEdit(null); setIsFabricModalOpen(true); }
                if(activeTab === 'seamstresses') { setSeamstressToEdit(null); setIsSeamstressModalOpen(true); }
            }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2">
              <Plus size={20} /> Novo Registro
            </button>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-10 pb-24 md:pb-10">
          
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard title="Aguardando Corte" value={metrics.planned} icon={ClipboardList} color="bg-blue-500" />
                <StatCard title="Em Produção" value={metrics.cutting} icon={Scissors} color="bg-purple-500" />
                <StatCard title="Costureiras Ativas" value={metrics.activeSeamstresses} icon={Users} color="bg-emerald-500" />
                <StatCard title="Peças do Mês" value={metrics.monthPieces} icon={Shirt} color="bg-indigo-500" />
              </div>
              
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="text-indigo-600" /> Produção Diária (Última Semana)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.weeklyData}>
                      <defs>
                        <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="peças" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorP)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTION - TABBED MOBILE LIST */}
          {activeTab === 'production' && (
            <div className="space-y-6">
              {/* STAGE SELECTOR (MOBILE SCROLL) */}
              <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar scroll-px-1">
                {Object.values(OrderStatus).map(status => (
                  <button 
                    key={status} 
                    onClick={() => setProductionStage(status)} 
                    className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl text-xs font-black transition-all whitespace-nowrap ${productionStage === status ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* ORDERS LIST (RESPONSIVE) */}
              <div className="grid grid-cols-1 gap-4">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-4 text-slate-400">
                    <Archive size={48} />
                    <p className="font-bold">Nenhum pedido nesta etapa.</p>
                  </div>
                ) : (
                  filteredOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0 font-black">#{order.id}</div>
                          <div>
                            <h4 className="font-black text-slate-800 text-lg leading-tight">{order.referenceCode}</h4>
                            <p className="text-sm text-slate-500 font-medium">{order.description}</p>
                            <div className="flex gap-1.5 mt-2">
                              {order.items.map((i,idx) => (
                                <div key={idx} className="w-4 h-4 rounded-full border border-slate-200 shadow-inner" style={{backgroundColor: i.colorHex}} title={i.color}></div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between md:flex-col md:items-end gap-1 px-4 py-3 md:p-0 bg-slate-50 md:bg-transparent rounded-2xl">
                          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 md:hidden">Peças Totais</span>
                          <div className="text-2xl font-black text-slate-800">
                            {order.items.reduce((acc, i) => acc + (order.status === OrderStatus.PLANNED ? i.estimatedPieces : i.actualPieces), 0)}
                            <span className="text-[10px] ml-1 text-slate-400">PÇS</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                           <button onClick={() => { setOrderToEdit(order); setIsOrderModalOpen(true); }} className="flex-1 md:flex-none p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors flex justify-center items-center"><Edit2 size={18}/></button>
                           <button onClick={() => { if(confirm('Excluir?')) db.orders.delete(order.id).then(fetchData); }} className="flex-1 md:flex-none p-3 rounded-2xl border border-slate-200 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors flex justify-center items-center"><Trash2 size={18}/></button>
                           {order.status === OrderStatus.PLANNED && (
                             <button onClick={() => setCuttingOrder(order)} className="flex-[2] md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition-all">Iniciar Corte</button>
                           )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* OTHERS TAB - GRID VIEW */}
          {(activeTab === 'fabrics' || activeTab === 'seamstresses') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === 'fabrics' && fabrics.map(f => (
                    <div key={f.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4 group">
                        <div className="flex justify-between items-start">
                            <div className="w-14 h-14 rounded-3xl shadow-inner border-4 border-white ring-1 ring-slate-100" style={{backgroundColor: f.colorHex}}></div>
                            <button onClick={() => { setFabricToEdit(f); setIsFabricModalOpen(true); }} className="p-2 rounded-xl hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"><Edit2 size={18}/></button>
                        </div>
                        <div>
                            <h4 className="font-black text-lg text-slate-800 truncate">{f.name}</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{f.color}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-500">Saldo:</span>
                            <span className="text-xl font-black text-indigo-700">{f.stockRolls} <span className="text-[10px] text-slate-400">ROLOS</span></span>
                        </div>
                    </div>
                ))}
                {activeTab === 'seamstresses' && seamstresses.map(s => (
                    <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4 group">
                        <div className="flex justify-between items-start">
                            <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl">{s.name.charAt(0)}</div>
                            <button onClick={() => { setSeamstressToEdit(s); setIsSeamstressModalOpen(true); }} className="p-2 rounded-xl hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"><Edit2 size={18}/></button>
                        </div>
                        <div>
                            <h4 className="font-black text-lg text-slate-800 truncate">{s.name}</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.specialty}</p>
                        </div>
                        <div className="text-sm text-slate-500 font-medium">
                            <p>{s.phone}</p>
                            <p className="truncate">{s.city}</p>
                        </div>
                    </div>
                ))}
            </div>
          )}
        </div>
      </main>

      {/* MOBILE FLOATING ACTION BUTTON */}
      <div className="md:hidden fixed bottom-6 right-6 z-40">
        <button onClick={() => {
            if(activeTab === 'production') { setOrderToEdit(null); setIsOrderModalOpen(true); }
            if(activeTab === 'fabrics') { setFabricToEdit(null); setIsFabricModalOpen(true); }
            if(activeTab === 'seamstresses') { setSeamstressToEdit(null); setIsSeamstressModalOpen(true); }
            if(activeTab === 'products') { setEditingProduct(null); setIsProductModalOpen(true); }
        }} className="w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"><Plus size={32}/></button>
      </div>

      {/* MODALS */}
      <OrderModal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} onSave={handleCreateOrder} references={references} orderToEdit={orderToEdit} />
      <FabricModal isOpen={isFabricModalOpen} onClose={() => setIsFabricModalOpen(false)} onSave={val => handleSaveFabric(val).then(fetchData)} fabricToEdit={fabricToEdit} />
      <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={val => handleSaveProduct(val).then(fetchData)} productToEdit={editingProduct} fabrics={fabrics} />
      <SeamstressModal isOpen={isSeamstressModalOpen} onClose={() => setIsSeamstressModalOpen(false)} onSave={val => handleSaveSeamstress(val).then(fetchData)} seamstressToEdit={seamstressToEdit} />
      <CutConfirmationModal isOpen={!!cuttingOrder} onClose={() => setCuttingOrder(null)} order={cuttingOrder} onConfirm={handleConfirmCut} />
    </div>
  );
}
