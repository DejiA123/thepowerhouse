
import React, { useState, useEffect, useRef } from 'react';

const DebugOverlay = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const formatMessage = (args: any[]) => {
      return args
        .map((arg) => {
          if (typeof arg === 'object' && arg !== null) {
            try {
              // Add a replacer to handle circular references
              const getCircularReplacer = () => {
                const seen = new WeakSet();
                return (key, value) => {
                  if (typeof value === "object" && value !== null) {
                    if (seen.has(value)) {
                      return "[Circular]";
                    }
                    seen.add(value);
                  }
                  return value;
                };
              };
              return JSON.stringify(arg, getCircularReplacer(), 2);
            } catch (e) {
              return 'Unserializable Object';
            }
          }
          if (arg === undefined) return 'undefined';
          return String(arg);
        })
        .join(' ');
    };

    const addToLogs = (prefix: string, args: any[]) => {
        const message = formatMessage(args);
        const timestamp = new Date().toLocaleTimeString();
        setLogs((prevLogs) => [...prevLogs, `[${timestamp}] ${prefix}: ${message}`]);
    }

    console.log = (...args: any[]) => {
      addToLogs('LOG', args);
      originalLog.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      addToLogs('WARN', args);
      originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      addToLogs('ERROR', args);
      originalError.apply(console, args);
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
    };
    window.addEventListener('unhandledrejection', rejectionHandler);

    // Initial log to confirm it's working
    console.log("Debug overlay initialized.");

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to the bottom
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      height: '25vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: '#00FF00', // Classic terminal green
      zIndex: 99999,
      padding: '10px',
      fontFamily: 'monospace',
      fontSize: '11px',
      overflowY: 'scroll',
      borderTop: '2px solid #444'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #555', paddingBottom: '5px', marginBottom: '5px' }}>
         <h4 style={{ margin: 0, color: 'white' }}>On-Screen Debug Log</h4>
         <button onClick={() => setLogs([])} style={{ background: '#444', color: 'white', border: 'none', padding: '2px 8px', borderRadius: '3px' }}>Clear</button>
      </div>
      {logs.map((log, index) => (
        <div key={index} style={{ whiteSpace: 'pre-wrap', borderBottom: '1px dotted #333', padding: '2px 0', wordBreak: 'break-all' }}>{log}</div>
      ))}
      <div ref={logsEndRef} />
    </div>
  );
};

export default DebugOverlay;
