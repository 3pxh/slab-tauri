import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'error' | 'success';
}

interface DebugLogContextType {
  logs: LogEntry[];
  addLog: (message: string, type?: 'info' | 'error' | 'success') => void;
  clearLogs: () => void;
}

const DebugLogContext = createContext<DebugLogContextType | undefined>(undefined);

export const useDebugLog = () => {
  const context = useContext(DebugLogContext);
  if (!context) {
    throw new Error('useDebugLog must be used within a DebugLogProvider');
  }
  return context;
};

export const DebugLogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      message,
      type,
    };
    setLogs((prev) => [...prev, entry].slice(-50)); // Keep last 50 logs
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <DebugLogContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </DebugLogContext.Provider>
  );
};

export const DebugLogDisplay: React.FC = () => {
  const { logs, clearLogs } = useDebugLog();

  // Only show debug logs if the debug flag is enabled
  const debugEnabled = false;

  if (!debugEnabled || logs.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 p-4 bg-gray-100 rounded-lg border border-gray-300 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Debug Logs</h3>
        <button
          onClick={clearLogs}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Clear
        </button>
      </div>
      <div className="space-y-1">
        {logs.map((log) => (
          <div
            key={log.id}
            className={`text-xs font-mono p-2 rounded ${
              log.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : log.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-gray-500 shrink-0">
                {log.timestamp.toLocaleTimeString()}
              </span>
              <span className="flex-1 break-words">{log.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

