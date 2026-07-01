import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { ChefHat, ListTree, Grid, Settings, Moon, BellRing, X, ArrowUpDown, Clock, Tag, Sparkles, LogOut } from 'lucide-react';
import LiveTicketBoard from './components/LiveTicketBoard';
import MenuManager from './components/MenuManager';
import SettingsManager from './components/SettingsManager';
import ServiceManager from './components/ServiceManager';
import OffersManager from './components/OffersManager';
import FeaturedManager from './components/FeaturedManager';
import WaiterMenu from './components/waiter/WaiterMenu';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import { supabase } from '@tablenet/supabase';
import { useRef } from 'react';
import { playNotificationSound } from './utils/soundProfiles';
import { Volume2, VolumeX } from 'lucide-react';
import Logo from './components/Logo';

function GlobalAssistanceListener() {
  const { user } = useAuth();
  const processedRequests = useRef(new Set());

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('global-assistance-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assistance_requests' }, (payload) => {
        const req = payload.new;
        if (req.status === 'pending' && !processedRequests.current.has(req.id)) {
          const soundDisabled = localStorage.getItem('kitchen_sound_disabled') === 'true';
          if (!soundDisabled) {
            const profile = localStorage.getItem('kitchen_request_sound_profile') || 'alert';
            playNotificationSound(profile);
          }

          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }

          processedRequests.current.add(req.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}

const KitchenClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Update every 10 seconds since we don't show seconds
    const timer = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md px-4 h-10 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner transition-colors duration-300 mt-1">
      <span className="font-bold text-[15px] text-theme-text-main tracking-wider uppercase">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
};

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function KitchenView() {
  const { kitchenId } = useParams();
  const [activeTab, setActiveTab] = useState(localStorage.getItem('kitchen_active_tab') || 'tickets'); // 'tickets', 'services', 'menu', 'settings'
  const [menuSubTab, setMenuSubTab] = useState(localStorage.getItem('kitchen_menu_subtab') || 'items'); // 'items', 'offers', 'featured'

  useEffect(() => {
    localStorage.setItem('kitchen_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('kitchen_menu_subtab', menuSubTab);
  }, [menuSubTab]);
  const [menuItemsCount, setMenuItemsCount] = useState(0);
  const [offersCount, setOffersCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('kitchen_sound_disabled') !== 'true');
  const [newTicketNotification, setNewTicketNotification] = useState(false);
  const [targetTableIdForService, setTargetTableIdForService] = useState(null);
  const [ticketSortOrder, setTicketSortOrder] = useState(localStorage.getItem('kitchen_ticket_sort') || 'oldest');

  const handleNavigateToServiceTable = (tableId) => {
    setTargetTableIdForService(tableId);
    setActiveTab('services');
  };

  useEffect(() => {
    if (activeTab === 'tickets') {
      setNewTicketNotification(false);
    }
  }, [activeTab]);

  const handleNewTicket = () => {
    setNewTicketNotification(true);
    setTimeout(() => setNewTicketNotification(false), 10000);
  };


  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('kitchen_sound_disabled', (!newState).toString());
    if (newState) {
      // Play a test sound to unlock browser audio context
      const profile = localStorage.getItem('kitchen_sound_profile') || 'classic';
      playNotificationSound(profile);
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden font-sans flex flex-col transition-colors duration-300">
      <header className="hidden md:flex bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-8 py-4 justify-between items-center z-20 sticky top-0 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-6">
          <Logo className="h-12 md:h-16 w-auto" color='#262626' />
          {/* <KitchenClock /> */}
        </div>

        <div className="flex items-center gap-1">
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner p-1.5 transition-all duration-300">
            {activeTab === 'tickets' && (
              <>
                <button
                  onClick={() => {
                    const newOrder = ticketSortOrder === 'oldest' ? 'newest' : 'oldest';
                    setTicketSortOrder(newOrder);
                    localStorage.setItem('kitchen_ticket_sort', newOrder);
                  }}
                  className={`group relative w-11 h-11 rounded-xl transition-all duration-300 flex items-center justify-center ${ticketSortOrder === 'newest'
                    ? 'text-theme-primary bg-white dark:bg-slate-900 shadow-md scale-100'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 scale-95 hover:scale-100'
                    }`}
                >
                  <ArrowUpDown size={20} strokeWidth={ticketSortOrder === 'newest' ? 2.5 : 2} />

                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-3 py-1.5 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl whitespace-nowrap z-50 pointer-events-none">
                    {ticketSortOrder === 'oldest' ? 'Oldest First' : 'Newest First'}
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800 dark:border-b-white"></div>
                  </div>
                </button>
                <div className="w-px h-6 bg-slate-200/80 dark:bg-slate-700/80 mx-0.5"></div>
              </>
            )}

            <button
              onClick={toggleSound}
              className={`group relative w-11 h-11 rounded-xl transition-all duration-300 flex items-center justify-center ${soundEnabled
                ? 'text-green-600 bg-white dark:bg-slate-900 shadow-md scale-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 scale-95 hover:scale-100'
                }`}
            >
              {soundEnabled ? <Volume2 size={20} strokeWidth={2.5} /> : <VolumeX size={20} />}

              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-3 py-1.5 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl whitespace-nowrap z-50 pointer-events-none">
                Sound {soundEnabled ? 'On' : 'Off'}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800 dark:border-b-white"></div>
              </div>
            </button>
          </div>

          <div className="hidden md:flex bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 transition-colors duration-300 shadow-inner gap-1">
            {[
              { id: 'tickets', icon: ChefHat, label: 'Tickets' },
              { id: 'services', icon: Grid, label: 'Services' },
              { id: 'menu', icon: ListTree, label: 'Menu' },
              { id: 'settings', icon: Settings, label: 'Settings' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 h-11 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2.5 whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 shadow-md text-theme-primary scale-100'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 scale-95 hover:scale-100'
                  }`}
              >
                <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface border-t border-theme-border flex justify-around p-2 pb-[max(1rem,env(safe-area-inset-bottom))] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all ${activeTab === 'tickets' ? 'text-theme-primary' : 'text-theme-text-sec'}`}
        >
          <ChefHat size={22} />
          <span className="text-[10px] font-bold">Tickets</span>
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all ${activeTab === 'services' ? 'text-theme-primary' : 'text-theme-text-sec'}`}
        >
          <Grid size={22} />
          <span className="text-[10px] font-bold">Services</span>
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all ${activeTab === 'menu' ? 'text-theme-primary' : 'text-theme-text-sec'}`}
        >
          <ListTree size={22} />
          <span className="text-[10px] font-bold">Menu</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all ${activeTab === 'settings' ? 'text-theme-primary' : 'text-theme-text-sec'}`}
        >
          <Settings size={22} />
          <span className="text-[10px] font-bold">Settings</span>
        </button>
      </nav>

      <main className="flex-1 overflow-x-hidden overflow-y-auto relative pb-20 md:pb-0">
        {newTicketNotification && activeTab !== 'tickets' && (
          <div
            onClick={() => {
              setActiveTab('tickets');
              setNewTicketNotification(false);
            }}
            className="fixed z-50 cursor-pointer flex items-center gap-4 bg-theme-primary text-white p-4 shadow-[0_10px_40px_rgba(226,55,68,0.3)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] top-4 left-4 right-4 md:top-auto md:left-auto md:bottom-8 md:right-8 rounded-2xl md:w-80 border border-white/20"
          >
            <div className="bg-white/20 p-2.5 rounded-full shadow-inner shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-extrabold text-[15px] md:text-[17px] leading-tight">New Order Ticket!</h4>
              <p className="text-[12px] md:text-[13px] font-medium opacity-90 mt-0.5">Tap to view</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNewTicketNotification(false);
              }}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors duration-200 shrink-0 opacity-80 hover:opacity-100"
              title="Dismiss"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
        )}
        <div className={activeTab === 'tickets' ? 'block h-full' : 'hidden'}>
          <LiveTicketBoard
            onNewTicket={handleNewTicket}
            onNavigateToTable={handleNavigateToServiceTable}
            sortOrder={ticketSortOrder}
            setSortOrder={setTicketSortOrder}
          />
        </div>
        <div className={activeTab === 'services' ? 'block h-full' : 'hidden'}>
          <ServiceManager targetTableId={targetTableIdForService} onTargetTableHandled={() => setTargetTableIdForService(null)} />
        </div>
        <div className={activeTab === 'menu' ? 'flex flex-col h-full overflow-hidden' : 'hidden'}>
          {/* Header & Desktop Toggle */}
          <div className="hidden md:block p-4 md:p-8 md:pb-0 pb-0 max-w-6xl mx-auto w-full pb-0 flex-shrink-0">
            <div className="flex flex-row justify-between items-center gap-4 border-b border-theme-border pb-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-theme-text-main mb-1">Menu Manager</h2>
                <p className="text-theme-text-sec text-sm font-medium">Manage your menu items and promotional offers.</p>
              </div>
              <div className="hidden md:flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl items-center">
                <button onClick={() => setMenuSubTab('items')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${menuSubTab === 'items' ? 'bg-white dark:bg-slate-700 shadow-sm text-theme-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                  <ListTree size={16} />
                  Items
                  {menuItemsCount > -1 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${menuSubTab === 'items' ? 'bg-theme-primary/10 text-theme-primary' : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'}`}>{menuItemsCount}</span>
                  )}
                </button>
                <button onClick={() => setMenuSubTab('featured')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${menuSubTab === 'featured' ? 'bg-white dark:bg-slate-700 shadow-sm text-theme-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                  <Sparkles size={16} />
                  Featured
                </button>
                <button onClick={() => setMenuSubTab('offers')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${menuSubTab === 'offers' ? 'bg-white dark:bg-slate-700 shadow-sm text-theme-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                  <Tag size={16} />
                  Offers
                  {offersCount > -1 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${menuSubTab === 'offers' ? 'bg-theme-primary/10 text-theme-primary' : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'}`}>{offersCount}</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden flex-shrink-0 flex p-3 px-4 gap-2 bg-surface/95 backdrop-blur-md border-b border-theme-border overflow-x-auto hide-scrollbar sticky top-0 z-10">
            <button
              onClick={() => setMenuSubTab('items')}
              className={`flex-1 min-h-[36px] min-w-[80px] py-2 text-xs font-bold rounded-xl duration-300 ease-in-out flex items-center justify-center gap-1.5 ${menuSubTab === 'items'
                ? 'bg-theme-primary text-white border border-theme-border shadow-md shadow-theme-primary/20'
                : 'bg-theme-bg text-theme-text-sec hover:bg-surface border border-theme-border'
                }`}
            >
              <ListTree size={14} />
              <span>Items</span>
              {menuItemsCount > -1 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${menuSubTab === 'items' ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'}`}>
                  {menuItemsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMenuSubTab('featured')}
              className={`flex-1 min-h-[36px] min-w-[80px] py-2 text-xs font-bold rounded-xl duration-300 ease-in-out flex items-center justify-center gap-1.5 ${menuSubTab === 'featured'
                ? 'bg-theme-primary text-white border border-theme-border shadow-md shadow-theme-primary/20'
                : 'bg-theme-bg text-theme-text-sec hover:bg-surface border border-theme-border'
                }`}
            >
              <Sparkles size={14} />
              <span>Featured</span>
            </button>
            <button
              onClick={() => setMenuSubTab('offers')}
              className={`flex-1 min-h-[36px] min-w-[80px] py-2 text-xs font-bold rounded-xl duration-300 ease-in-out flex items-center justify-center gap-1.5 ${menuSubTab === 'offers'
                ? 'bg-theme-primary text-white border border-theme-border shadow-md shadow-theme-primary/20'
                : 'bg-theme-bg text-theme-text-sec hover:bg-surface border border-theme-border'
                }`}
            >
              <Tag size={14} />
              <span>Offers</span>
              {offersCount > -1 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${menuSubTab === 'offers' ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'}`}>
                  {offersCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className={menuSubTab === 'items' ? 'block' : 'hidden'}>
              <MenuManager onCountUpdate={setMenuItemsCount} />
            </div>
            <div className={menuSubTab === 'featured' ? 'block' : 'hidden'}>
              <FeaturedManager />
            </div>
            <div className={menuSubTab === 'offers' ? 'block' : 'hidden'}>
              <OffersManager onCountUpdate={setOffersCount} />
            </div>
          </div>
        </div>
        <div className={activeTab === 'settings' ? 'block h-full' : 'hidden'}>
          <SettingsManager
            ticketSortOrder={ticketSortOrder}
            onSortOrderChange={(val) => {
              setTicketSortOrder(val);
              localStorage.setItem('kitchen_ticket_sort', val);
            }}
            soundEnabled={soundEnabled}
            onSoundToggle={toggleSound}
          />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalAssistanceListener />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/k/:kitchenId" element={<PrivateRoute><KitchenView /></PrivateRoute>} />
          <Route path="/k/:kitchenId/table/:tableId/menu" element={<PrivateRoute><WaiterMenu /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/k/1" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
