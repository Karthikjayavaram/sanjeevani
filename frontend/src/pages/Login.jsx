import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="min-h-screen flex items-center justify-center bg-bg-secondary p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[420px] space-y-8 premium-card p-10 md:p-12 relative overflow-hidden"
      >
        {/* Decorative background element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl"></div>
        
        <div className="text-center relative z-10">
          <div className="mx-auto h-14 w-14 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
            <Package size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Sanjeevani Agencies</h2>
          <p className="mt-2 text-sm text-text-secondary font-medium">Enter your credentials to access the admin panel</p>
        </div>
        
        <form className="mt-8 space-y-5 relative z-10" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                className="floating-input"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="email" className="floating-label">Email Address</label>
            </div>
            <div className="relative">
              <input
                id="password"
                type="password"
                required
                className="floating-input"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label htmlFor="password" className="floating-label">Password</label>
            </div>
          </div>

          <div className="pt-2">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading} 
              className={`w-full btn-primary ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Signing in...' : (
                <>
                  Sign in <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </PageTransition>
  );
};

export default Login;
