import React from 'react';

export default function PageSkeleton() {
    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            <div style={{ height: '60px', width: '40%', background: 'var(--s2)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ height: '120px', flex: 1, background: 'var(--s2)', borderRadius: '12px', animation: 'pulse 1.5s infinite 0.2s' }}></div>
                <div style={{ height: '120px', flex: 1, background: 'var(--s2)', borderRadius: '12px', animation: 'pulse 1.5s infinite 0.4s' }}></div>
                <div style={{ height: '120px', flex: 1, background: 'var(--s2)', borderRadius: '12px', animation: 'pulse 1.5s infinite 0.6s' }}></div>
            </div>
            <div style={{ height: '400px', width: '100%', background: 'var(--s2)', borderRadius: '12px', animation: 'pulse 1.5s infinite 0.8s' }}></div>
            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
}
