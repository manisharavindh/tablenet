import { useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import TablesOverview from './components/TablesOverview';
import TableDetail from './components/TableDetail';
import WaiterMenu from './components/WaiterMenu';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import { supabase } from '@tablenet/supabase';
import { useEffect, useRef } from 'react';

import { playNotificationSound } from './utils/soundProfiles';

function GlobalNotificationListener() {
  const { user } = useAuth();
  const processedOrders = useRef(new Set());

  useEffect(() => {
    if (!user) return;
    
    const channel1 = supabase.channel('global-ready-notifications')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const order = payload.new;
        if (order.status === 'ready' && !processedOrders.current.has(order.id)) {
          const soundDisabled = localStorage.getItem('waiter_sound_disabled') === 'true';
          if (!soundDisabled) {
            const profile = localStorage.getItem('waiter_sound_profile') || 'classic';
            playNotificationSound(profile);
          }
          
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
          
          processedOrders.current.add(order.id);
        }
      })
      .subscribe();

    const channel2 = supabase.channel('global-assistance-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assistance_requests' }, (payload) => {
        const soundDisabled = localStorage.getItem('waiter_sound_disabled') === 'true';
        if (!soundDisabled) {
          const profile = localStorage.getItem('waiter_request_sound_profile') || 'alert';
          playNotificationSound(profile);
        }
        if ('vibrate' in navigator) {
          navigator.vibrate([300, 100, 300]);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [user]);

  return null;
}

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function WaiterView() {
  const { waiterId } = useParams();
  const [selectedTable, setSelectedTable] = useState(() => {
    try {
      const saved = sessionStorage.getItem('selectedTable');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleSelectTable = (table) => {
    if (table) {
      sessionStorage.setItem('selectedTable', JSON.stringify(table));
    } else {
      sessionStorage.removeItem('selectedTable');
    }
    setSelectedTable(table);
  };

  return (
    <div className="min-h-screen font-sans bg-background">
      {selectedTable ? (
        <TableDetail table={selectedTable} onBack={() => handleSelectTable(null)} waiterId={waiterId} />
      ) : (
        <TablesOverview onSelectTable={handleSelectTable} waiterId={waiterId} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalNotificationListener />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/w/:waiterId" element={<PrivateRoute><WaiterView /></PrivateRoute>} />
          <Route path="/w/:waiterId/table/:tableId/menu" element={<PrivateRoute><WaiterMenu /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/w/1" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
