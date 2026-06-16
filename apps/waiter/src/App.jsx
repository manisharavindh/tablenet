import { useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import TablesOverview from './components/TablesOverview';
import TableDetail from './components/TableDetail';

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
    <BrowserRouter>
      <Routes>
        <Route path="/w/:waiterId" element={<WaiterView />} />
        <Route path="*" element={<Navigate to="/w/1" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
