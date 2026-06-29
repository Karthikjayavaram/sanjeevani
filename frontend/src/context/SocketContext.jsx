import { createContext, useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, logout } = useContext(AuthContext);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL.replace('/api', ''));
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  // Register user for single-session enforcement
  useEffect(() => {
    if (socket && user?._id) {
      socket.emit('register_user', { userId: user._id });

      const handleSessionExpired = ({ message }) => {
        logout();
        setTimeout(() => { alert('Session Ended: ' + message); }, 200);
      };

      socket.on('session_expired', handleSessionExpired);
      return () => socket.off('session_expired', handleSessionExpired);
    }
  }, [socket, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};