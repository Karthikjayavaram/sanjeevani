import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BrandDetails from './pages/BrandDetails';
import AddEditBrand from './pages/AddEditBrand';
import Billing from './pages/Billing';
import BillDetails from './pages/BillDetails';
import EditBill from './pages/EditBill';
import Summary from './pages/Summary';
import Layout from './components/Layout';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="brand/add" element={<AddEditBrand />} />
          <Route path="brand/:id/edit" element={<AddEditBrand />} />
          <Route path="brand/:id" element={<BrandDetails />} />
          <Route path="billing" element={<Billing />} />
          <Route path="bills/:id" element={<BillDetails />} />
          <Route path="bills/:id/edit" element={<EditBill />} />
          <Route path="summary" element={<Summary />} />
          {/* Notifications placeholder */}
          <Route path="notifications" element={<div className="p-8 text-center text-gray-500">Notifications coming soon...</div>} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
