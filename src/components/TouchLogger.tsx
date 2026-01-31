import { useEffect, useState } from 'react';

export const TouchLogger = () => {
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        const log = (msg: string) => {
            setLogs(prev => [msg, ...prev].slice(0, 20));
        };

        const handleTouch = (e: TouchEvent) => {
            const touch = e.touches[0];
            const target = e.target as HTMLElement;
            const msg = `${e.type}: ${target.tagName.toLowerCase()}.${target.className.split(' ').slice(0, 2).join('.')}`;
            log(msg);
        };

        window.addEventListener('touchstart', handleTouch, { passive: true });
        window.addEventListener('touchmove', handleTouch, { passive: true });
        window.addEventListener('touchend', handleTouch, { passive: true });

        return () => {
            window.removeEventListener('touchstart', handleTouch);
            window.removeEventListener('touchmove', handleTouch);
            window.removeEventListener('touchend', handleTouch);
        };
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.8)',
            color: '#0f0',
            fontFamily: 'monospace',
            fontSize: '10px',
            padding: '4px',
            pointerEvents: 'none',
            maxHeight: '50vh',
            overflow: 'hidden',
            width: '100vw'
        }}>
            {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
    );
};
