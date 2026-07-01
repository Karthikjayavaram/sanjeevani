import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import PageTransition from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Forgot password states
  const [mode, setMode] = useState('login'); // 'login' | 'forgot_password' | 'reset_password'
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, { email });
      toast.success(res.data.message || 'OTP sent successfully');
      setMode('reset_password');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/reset-password`, { email, otp, newPassword });
      toast.success(res.data.message || 'Password reset successfully');
      setMode('login');
      setPassword('');
      setOtp('');
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
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
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Sanjeevani Veeresh</h2>
          <p className="mt-2 text-sm text-text-secondary font-medium">
            {mode === 'login' && "Enter your credentials to access the admin panel"}
            {mode === 'forgot_password' && "Enter your email to receive an OTP"}
            {mode === 'reset_password' && "Enter the OTP sent to your email and your new password"}
          </p>
        </div>
        
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {/* LOGIN MODE */}
            {mode === 'login' && (
              <motion.form 
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5" 
                onSubmit={handleLogin}
              >
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
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="floating-input pr-12"
                      placeholder=" "
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <label htmlFor="password" className="floating-label">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1 focus:outline-none transition-colors"
                      tabIndex="-1"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setMode('forgot_password')}
                      className="text-sm font-medium text-primary hover:underline focus:outline-none"
                    >
                      Forgot password?
                    </button>
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
              </motion.form>
            )}

            {/* FORGOT PASSWORD MODE */}
            {mode === 'forgot_password' && (
              <motion.form 
                key="forgot"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5" 
                onSubmit={handleForgotPassword}
              >
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      id="email-reset"
                      type="email"
                      required
                      className="floating-input"
                      placeholder=" "
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <label htmlFor="email-reset" className="floating-label">Email Address</label>
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={loading} 
                    className={`w-full btn-primary ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Sending OTP...' : 'Send Reset OTP'}
                  </motion.button>
                  
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="w-full flex items-center justify-center text-sm font-medium text-text-secondary hover:text-text-primary focus:outline-none transition-colors"
                  >
                    <ArrowLeft size={16} className="mr-1" /> Back to login
                  </button>
                </div>
              </motion.form>
            )}

            {/* RESET PASSWORD MODE */}
            {mode === 'reset_password' && (
              <motion.form 
                key="reset"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5" 
                onSubmit={handleResetPassword}
              >
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      id="email-disabled"
                      type="email"
                      disabled
                      className="floating-input bg-gray-50 opacity-70 cursor-not-allowed"
                      placeholder=" "
                      value={email}
                    />
                    <label htmlFor="email-disabled" className="floating-label">Email Address</label>
                  </div>
                  
                  <div className="relative">
                    <input
                      id="otp"
                      type="text"
                      required
                      maxLength={6}
                      className="floating-input text-center tracking-widest font-mono text-lg"
                      placeholder=" "
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                    <label htmlFor="otp" className="floating-label">6-Digit OTP</label>
                  </div>
                  
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="floating-input pr-12"
                      placeholder=" "
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <label htmlFor="newPassword" className="floating-label">New Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1 focus:outline-none transition-colors"
                      tabIndex="-1"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={loading} 
                    className={`w-full btn-primary ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </motion.button>
                  
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="w-full flex items-center justify-center text-sm font-medium text-text-secondary hover:text-text-primary focus:outline-none transition-colors"
                  >
                    <ArrowLeft size={16} className="mr-1" /> Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </PageTransition>
  );
};

export default Login;
