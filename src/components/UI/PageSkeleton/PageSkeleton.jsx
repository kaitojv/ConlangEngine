import React from 'react';
import { motion } from 'framer-motion';

export default function PageSkeleton({ type = 'dashboard', count = 5 }) {
    // Premium Shimmer gradient animation for dark/light themes
    const shimmerAnimation = {
        background: [
            'linear-gradient(90deg, var(--s2) 0%, var(--s3) 50%, var(--s2) 100%)',
            'linear-gradient(90deg, var(--s3) 0%, var(--s2) 50%, var(--s3) 100%)'
        ],
        backgroundSize: '200% 100%',
        transition: { duration: 1.5, repeat: Infinity, ease: 'linear' }
    };

    if (type === 'lexicon') {
        return (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <motion.div animate={shimmerAnimation} style={{ height: '40px', width: '30%', borderRadius: 'var(--rad)' }} />
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <motion.div animate={shimmerAnimation} style={{ height: '36px', width: '120px', borderRadius: '20px' }} />
                    <motion.div animate={shimmerAnimation} style={{ height: '36px', width: '120px', borderRadius: '20px' }} />
                </div>
                {Array.from({ length: count }).map((_, i) => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{ height: '100px', width: '100%', borderRadius: 'var(--rad)', overflow: 'hidden' }}
                    >
                        <motion.div animate={shimmerAnimation} style={{ height: '100%', width: '100%' }} />
                    </motion.div>
                ))}
            </div>
        );
    }

    if (type === 'conlangs') {
        return (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <motion.div animate={shimmerAnimation} style={{ height: '50px', width: '40%', borderRadius: 'var(--rad)' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {Array.from({ length: count }).map((_, i) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            style={{ height: '200px', borderRadius: 'var(--rad)', overflow: 'hidden' }}
                        >
                            <motion.div animate={shimmerAnimation} style={{ height: '100%', width: '100%' }} />
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            <motion.div animate={shimmerAnimation} style={{ height: '60px', width: '40%', borderRadius: 'var(--rad)' }}></motion.div>
            <div style={{ display: 'flex', gap: '20px' }}>
                <motion.div animate={shimmerAnimation} style={{ height: '120px', flex: 1, borderRadius: 'var(--rad)' }}></motion.div>
                <motion.div animate={shimmerAnimation} style={{ height: '120px', flex: 1, borderRadius: 'var(--rad)' }}></motion.div>
                <motion.div animate={shimmerAnimation} style={{ height: '120px', flex: 1, borderRadius: 'var(--rad)' }}></motion.div>
            </div>
            <motion.div animate={shimmerAnimation} style={{ height: '400px', width: '100%', borderRadius: 'var(--rad)' }}></motion.div>
        </div>
    );
}
