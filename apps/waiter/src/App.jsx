import { useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import TablesOverview from './components/TablesOverview';
import TableDetail from './components/TableDetail';
import WaiterMenu from './components/WaiterMenu';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function WaiterView() {
  const { waiterId } = useParams();
  const [selectedTable, setSelectedTable] = useState(null);

  return (
    <div className="min-h-screen font-sans bg-background">
      {selectedTable ? (
        <TableDetail table={selectedTable} onBack={() => setSelectedTable(null)} waiterId={waiterId} />
      ) : (
        <TablesOverview onSelectTable={setSelectedTable} waiterId={waiterId} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
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
