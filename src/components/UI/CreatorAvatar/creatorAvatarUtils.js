import {
    User, Sparkles, Feather, BookOpen, Crown, Compass, Flame, Atom,
    Globe, Scroll, Wand2, Languages, Music, Moon, Sun, Gem
} from 'lucide-react';

export const CREATOR_AVATAR_ICONS = [
    { id: 'User', label: 'Classic', Icon: User },
    { id: 'Sparkles', label: 'Sparkles', Icon: Sparkles },
    { id: 'Feather', label: 'Scribe', Icon: Feather },
    { id: 'BookOpen', label: 'Scholar', Icon: BookOpen },
    { id: 'Crown', label: 'Monarch', Icon: Crown },
    { id: 'Compass', label: 'Explorer', Icon: Compass },
    { id: 'Flame', label: 'Flame', Icon: Flame },
    { id: 'Atom', label: 'Inventor', Icon: Atom },
    { id: 'Globe', label: 'Worldbuilder', Icon: Globe },
    { id: 'Scroll', label: 'Lorekeeper', Icon: Scroll },
    { id: 'Wand2', label: 'Alchemist', Icon: Wand2 },
    { id: 'Languages', label: 'Polyglot', Icon: Languages },
    { id: 'Music', label: 'Phonetician', Icon: Music },
    { id: 'Moon', label: 'Lunar', Icon: Moon },
    { id: 'Sun', label: 'Solar', Icon: Sun },
    { id: 'Gem', label: 'Artisan', Icon: Gem }
];

export const CREATOR_ICON_MAP = Object.fromEntries(
    CREATOR_AVATAR_ICONS.map(item => [item.id, item.Icon])
);

export const CREATOR_AVATAR_COLORS = [
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#ef4444',
    '#f59e0b',
    '#10b981',
    '#0ea5e9',
    '#14b8a6'
];

/**
 * Center-crops and compresses an uploaded image file on an offscreen canvas
 * into a lightweight data URL (~3-10 KB) suitable for localStorage, project
 * configs, and Supabase auth user_metadata without requiring storage buckets.
 */
export function compressAvatarImage(file, targetSize = 128) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type?.startsWith('image/')) {
            reject(new Error('Please select a valid image file.'));
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('Invalid image file.'));
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetSize;
                canvas.height = targetSize;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas unavailable.'));
                    return;
                }
                const side = Math.min(img.width, img.height);
                const sx = Math.max(0, (img.width - side) / 2);
                const sy = Math.max(0, (img.height - side) / 2);
                ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);

                let dataUrl = canvas.toDataURL('image/webp', 0.8);
                if (!dataUrl || dataUrl.length > 24000 || !dataUrl.startsWith('data:image/webp')) {
                    dataUrl = canvas.toDataURL('image/jpeg', 0.72);
                }
                if (dataUrl.length > 32000) {
                    dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                }
                resolve(dataUrl);
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}
