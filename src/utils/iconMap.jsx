import { 
    Globe, Flag, MessageCircle, Map, Book, Feather, 
    Sun, Moon, Star, Flame, Mountain, Waves, 
    Leaf, Crown, Shield, Sword, Heart, Eye, 
    Music, Wind, Anchor, Castle, Compass, Hexagon
} from 'lucide-react';

export const CONLANG_ICONS = {
    Globe, Flag, MessageCircle, Map, Book, Feather,
    Sun, Moon, Star, Flame, Mountain, Waves,
    Leaf, Crown, Shield, Sword, Heart, Eye,
    Music, Wind, Anchor, Castle, Compass, Hexagon
};

export const getConlangIcon = (iconName, size = 24) => {
    const IconComponent = CONLANG_ICONS[iconName] || Globe;
    return <IconComponent size={size} />;
};
