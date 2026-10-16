import React from 'react';
import {
    // Linguistics, Scripts & Audio
    Languages, Speech, Book, BookOpen, Library, Scroll, ScrollText,
    Feather, PenTool, PenLine, Type, Quote, MessageCircle, MessageSquare,
    Mic, Volume2, Ear, Headphones, SpellCheck, FileText, Bookmark, AudioLines, ScanText,

    // Nature, Elements & Astronomy
    Sun, Moon, Star, Sparkles, Sparkle, Flame, Mountain, MountainSnow,
    Waves, Wind, Leaf, TreePine, Trees, TreeDeciduous, Flower2, Sprout,
    Sunrise, Sunset, Cloud, CloudRain, CloudLightning, Snowflake, Droplet, Droplets, Earth,

    // Fantasy, History, Lore & War
    Crown, Castle, Landmark, Pyramid, Shield, ShieldCheck, Sword, Swords,
    Axe, Hammer, Anvil, Hourglass, History, Wand2, Gem, Diamond,
    Skull, Ghost, Bone, Key, Lock, Anchor, Compass, Dices, Dice5, FlaskConical, Tent,

    // Fauna, Creatures & Life
    Bird, Fish, Bug, PawPrint, Cat, Dog, Snail, Footprints, Egg, Rabbit, FishSymbol,

    // Sci-Fi, Logic & Engineering
    Rocket, Orbit, Atom, Bot, Cpu, Terminal, Code, Binary,
    Satellite, Telescope, Radio, Radar, CircuitBoard, Crosshair, Zap,

    // Symbols, Society & Artifacts
    Globe, Flag, Heart, Eye, Music, Hexagon, Infinity as LucideInfinity, Lightbulb,
    Palette, Smile, Award, Trophy, Medal, Coins, Scale, Target,
    Boxes, CircleDot, Map, MapPin, Hash, Asterisk, HelpCircle
} from 'lucide-react';

export const CONLANG_ICONS = {
    // Original 24 icons preserved at the top
    Globe, Flag, MessageCircle, Map, Book, Feather,
    Sun, Moon, Star, Flame, Mountain, Waves,
    Leaf, Crown, Shield, Sword, Heart, Eye,
    Music, Wind, Anchor, Castle, Compass, Hexagon,

    // Linguistics, Scripts & Audio
    Languages, Speech, BookOpen, Library, Scroll, ScrollText,
    PenTool, PenLine, Type, Quote, MessageSquare,
    Mic, Volume2, Ear, Headphones, SpellCheck, FileText, Bookmark, AudioLines, ScanText,

    // Nature, Elements & Astronomy
    Sparkles, Sparkle, MountainSnow, TreePine, Trees, TreeDeciduous, Flower2, Sprout,
    Sunrise, Sunset, Cloud, CloudRain, CloudLightning, Snowflake, Droplet, Droplets, Earth,

    // Fantasy, History, Lore & War
    Landmark, Pyramid, ShieldCheck, Swords, Axe, Hammer, Anvil,
    Hourglass, History, Wand2, Gem, Diamond, Skull, Ghost, Bone,
    Key, Lock, Dices, Dice5, FlaskConical, Tent,

    // Fauna, Creatures & Life
    Bird, Fish, Bug, PawPrint, Cat, Dog, Snail, Footprints, Egg, Rabbit, FishSymbol,

    // Sci-Fi, Logic & Engineering
    Rocket, Orbit, Atom, Bot, Cpu, Terminal, Code, Binary,
    Satellite, Telescope, Radio, Radar, CircuitBoard, Crosshair, Zap,

    // Symbols, Society & Artifacts
    Infinity: LucideInfinity, Lightbulb, Palette, Smile, Award, Trophy,
    Medal, Coins, Scale, Target, Boxes, CircleDot, MapPin, Hash, Asterisk, HelpCircle
};

const ICON_LOOKUP_LOWER = Object.keys(CONLANG_ICONS).reduce((acc, name) => {
    acc[name.toLowerCase()] = CONLANG_ICONS[name];
    return acc;
}, {});

export const CONLANG_ICON_CATEGORIES = [
    {
        id: 'all',
        labelKey: 'settings.system.iconCategoryAll',
        fallbackLabel: 'All'
    },
    {
        id: 'linguistics',
        labelKey: 'settings.system.iconCategoryLinguistics',
        fallbackLabel: 'Linguistics & Writing',
        icons: [
            'Languages', 'Speech', 'Book', 'BookOpen', 'Library', 'Scroll', 'ScrollText',
            'Feather', 'PenTool', 'PenLine', 'Type', 'Quote', 'MessageCircle', 'MessageSquare',
            'Mic', 'Volume2', 'Ear', 'Headphones', 'SpellCheck', 'FileText', 'Bookmark', 'AudioLines', 'ScanText'
        ]
    },
    {
        id: 'nature',
        labelKey: 'settings.system.iconCategoryNature',
        fallbackLabel: 'Nature & Elements',
        icons: [
            'Sun', 'Moon', 'Star', 'Sparkles', 'Sparkle', 'Flame', 'Mountain', 'MountainSnow',
            'Waves', 'Wind', 'Leaf', 'TreePine', 'Trees', 'TreeDeciduous', 'Flower2', 'Sprout',
            'Sunrise', 'Sunset', 'Cloud', 'CloudRain', 'CloudLightning', 'Snowflake', 'Droplet', 'Droplets', 'Earth'
        ]
    },
    {
        id: 'fantasy',
        labelKey: 'settings.system.iconCategoryFantasy',
        fallbackLabel: 'Fantasy & Lore',
        icons: [
            'Crown', 'Castle', 'Landmark', 'Pyramid', 'Shield', 'ShieldCheck', 'Sword', 'Swords',
            'Axe', 'Hammer', 'Anvil', 'Hourglass', 'History', 'Wand2', 'Gem', 'Diamond',
            'Skull', 'Ghost', 'Bone', 'Key', 'Lock', 'Anchor', 'Compass', 'Dices', 'Dice5', 'FlaskConical', 'Tent'
        ]
    },
    {
        id: 'creatures',
        labelKey: 'settings.system.iconCategoryCreatures',
        fallbackLabel: 'Fauna & Beasts',
        icons: [
            'Bird', 'Fish', 'Bug', 'PawPrint', 'Cat', 'Dog', 'Snail', 'Footprints', 'Egg', 'Rabbit', 'FishSymbol'
        ]
    },
    {
        id: 'scifi',
        labelKey: 'settings.system.iconCategoryScifi',
        fallbackLabel: 'Sci-Fi & Tech',
        icons: [
            'Rocket', 'Orbit', 'Atom', 'Bot', 'Cpu', 'Terminal', 'Code', 'Binary',
            'Satellite', 'Telescope', 'Radio', 'Radar', 'CircuitBoard', 'Crosshair', 'Zap'
        ]
    },
    {
        id: 'symbols',
        labelKey: 'settings.system.iconCategorySymbols',
        fallbackLabel: 'Symbols & Society',
        icons: [
            'Globe', 'Flag', 'Heart', 'Eye', 'Music', 'Hexagon', 'Infinity', 'Lightbulb',
            'Palette', 'Smile', 'Award', 'Trophy', 'Medal', 'Coins', 'Scale', 'Target',
            'Boxes', 'CircleDot', 'Map', 'MapPin', 'Hash', 'Asterisk', 'HelpCircle'
        ]
    }
];

export const getConlangIcon = (iconName, size = 24, props = {}) => {
    if (!iconName) return <Globe size={size} {...props} />;
    const IconComponent = CONLANG_ICONS[iconName] || ICON_LOOKUP_LOWER[String(iconName).toLowerCase()] || Globe;
    return <IconComponent size={size} {...props} />;
};
