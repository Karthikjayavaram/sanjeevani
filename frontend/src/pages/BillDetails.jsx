import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const BillDetails = () => {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBill();
  }, [id]);

  const fetchBill = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`http://${window.location.hostname}:5001/api/bills/${id}`, config);
      setBill(res.data);
    } catch (error) {
      toast.error('Failed to load bill');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this bill? Stock will be restored.')) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`http://${window.location.hostname}:5001/api/bills/${id}`, config);
      toast.success('Bill cancelled and stock restored');
      navigate(-1);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel bill');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  if (!bill) return <div className="p-8 text-center">Bill not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 print:bg-white print:pb-0">
      {/* Header - Hidden in Print */}
      <div className="p-4 flex items-center justify-between print:hidden">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold dark:text-white">Bill Details</h1>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => navigate(`/bills/${id}/edit`)} className="p-2 bg-blue-100 text-blue-600 rounded-full">
            <Edit2 size={20} />
          </button>
          <button onClick={handlePrint} className="p-2 bg-blue-100 text-blue-600 rounded-full">
            <Printer size={20} />
          </button>
          <button onClick={handleCancel} className="p-2 bg-red-100 text-red-600 rounded-full">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Printable Area */}
      <div className="p-4 print:p-0">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm print:shadow-none print:rounded-none">
          <div className="text-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider">{bill.millName}</h2>
            <p className="text-gray-500 text-sm mt-1">Tax Invoice / Bill of Supply</p>
          </div>

          <div className="flex justify-between mb-8 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Billed To:</p>
              <p className="font-bold text-gray-900 dark:text-white text-lg">{bill.partyName}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900 dark:text-white">{bill.billNumber}</p>
              <p className="text-gray-500">{format(new Date(bill.createdAt), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
          </div>

          <div className="mb-6">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="py-2 font-bold text-gray-700 dark:text-gray-300">S.No</th>
                  <th className="py-2 font-bold text-gray-700 dark:text-gray-300">Item Description</th>
                  <th className="py-2 font-bold text-gray-700 dark:text-gray-300 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, index) => (
                  <tr key={item._id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 text-gray-500">{index + 1}</td>
                    <td className="py-3">
                      <p className="font-bold text-gray-900 dark:text-white">{item.brand?.name}</p>
                      <p className="text-xs text-gray-500">{item.brand?.variant}</p>
                    </td>
                    <td className="py-3 text-right font-bold text-gray-900 dark:text-white">{item.quantity} Bags</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                  <td colSpan="2" className="py-3 font-black text-right text-gray-900 dark:text-white">Total Quantity:</td>
                  <td className="py-3 text-right font-black text-xl text-blue-600">{bill.totalQuantity} Bags</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-12 text-center text-xs text-gray-400">
            <p>Generated by {bill.adminId?.name}</p>
            <p>Thank you for doing business with us!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillDetails;

