import { useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import TablesOverview from './components/TablesOverview';
import TableDetail from './components/TableDetail';
import WaiterMenu from './components/WaiterMenu';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import { supabase } from '@tablenet/supabase';
import { useEffect, useRef } from 'react';

const playBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Two quick beeps
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.15); // C6
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

function GlobalNotificationListener() {
  const { user } = useAuth();
  const processedOrders = useRef(new Set());

  useEffect(() => {
    if (!user) return;
    
    const channel = supabase.channel('global-ready-notifications')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const order = payload.new;
        if (order.status === 'ready' && !processedOrders.current.has(order.id)) {
          playBeep();
          
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
          
          processedOrders.current.add(order.id);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
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
