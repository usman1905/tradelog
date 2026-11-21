import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const [shown, setShown] = useState(false);
  const timer = useRef();

  const toast = useCallback(text => {
    setMessage(text);
    setShown(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), 2200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={`toast${shown ? ' show' : ''}`} role="status" aria-live="polite">{message}</div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
