import { createContext, useContext } from 'react';
import { useLogs } from '@/hooks/use-logs';

const LogContext = createContext<ReturnType<typeof useLogs> | null>(null);

export const LogProvider = ({ children }: { children: React.ReactNode }) => {
  const logHook = useLogs();
  return <LogContext.Provider value={logHook}>{children}</LogContext.Provider>;
};

export const useLogContext = () => {
  const context = useContext(LogContext);
  if (!context) throw new Error("useLogContext must be used within a LogProvider");
  return context;
};