import React from 'react';
import { User } from 'lucide-react';
import { CREATOR_ICON_MAP } from './creatorAvatarUtils.js';

export default function CreatorAvatar({
    avatar = null,
    name = '',
    size = 44,
    className = '',
    style = {}
}) {
    const safeAvatar = avatar && typeof avatar === 'object' ? avatar : {};
    const bgColor = safeAvatar.color || '#6366f1';
    const IconComp = CREATOR_ICON_MAP[safeAvatar.icon] || User;
    const isImage = safeAvatar.type === 'image'
        && typeof safeAvatar.imageData === 'string'
        && safeAvatar.imageData.startsWith('data:image/');

    return (
        <div
            className={`creator-avatar-badge ${className}`.trim()}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: isImage
                    ? 'var(--s3)'
                    : `linear-gradient(135deg, ${bgColor}, color-mix(in srgb, ${bgColor} 72%, #000))`,
                color: '#fff',
                border: '2px solid rgba(255,255,255,0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                ...style
            }}
            aria-label={name ? `${name} avatar` : 'Creator avatar'}
        >
            {isImage ? (
                <img
                    src={safeAvatar.imageData}
                    alt={name || 'Creator avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
            ) : (
                React.createElement(IconComp, {
                    size: Math.max(14, Math.round(size * 0.52)),
                    strokeWidth: 2.1,
                    color: '#ffffff'
                })
            )}
        </div>
    );
}
