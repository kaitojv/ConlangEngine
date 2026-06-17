import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';

import { Sunrise, Sun, Moon, Sparkles, Settings2, BookA, PlusCircle, BrainCircuit, Flame, ArrowRight, Bookmark, Library, HelpCircle, Heart, Coffee } from 'lucide-react';
import Card from '@/components/UI/Card/Card.jsx';
import './home.css';


export default function Home() {
    const authorName = useConfigStore((state) => state.authorName) || "Creator";
    const conlangName = useConfigStore((state) => state.conlangName) || "your conlang";
    const streak = useConfigStore((state) => state.streak) || 0;
    const lastStudyDate = useConfigStore((state) => state.lastStudyDate);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const isFeaturalBlock = phonologyTypes === 'featural_block';
    const { transliterate } = useTransliterator();
    const navigate = useNavigate();

    const [greeting, setGreeting] = useState({
        base: "Hello",
        subtext: "Welcome to your linguistic laboratory.",
        Icon: Sparkles
    });

    React.useEffect(() => {
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        const month = now.getMonth();
        const date = now.getDate();
        
        const greetings = {
            morning: {
                base: "Good morning",
                phrases: [
                    "Early bird catches the root! Ready to build?", 
                    "Morning! Time to craft some fresh vowels.", 
                    "A new day, a new syntax rule."
                ],
                Icon: Sunrise
            },
            afternoon: {
                base: "Good afternoon",
                phrases: [
                    "Welcome back to your linguistic laboratory.", 
                    "Hope your day is as structured as your grammar.", 
                    "Time to forge some new vocabulary."
                ],
                Icon: Sun
            },
            evening: {
                base: "Good evening",
                phrases: [
                    "Dusk is falling. Perfect time to review your grammar.", 
                    "The stars are out, and the words are waiting.", 
                    "A quiet evening for some phonology."
                ],
                Icon: Moon
            },
            night: {
                base: "Hello night owl",
                phrases: [
                    "Late night inspiration? Let's craft some words.", 
                    "The best ideas come at midnight.", 
                    "Burning the midnight oil for that perfect translation?"
                ],
                Icon: Sparkles
            }
        };

        let timeOfDay = 'night';
        if (hour >= 5 && hour < 12) timeOfDay = 'morning';
        else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
        else if (hour >= 18 && hour < 22) timeOfDay = 'evening';

        const selected = { ...greetings[timeOfDay] };
        selected.phrases = [...selected.phrases];

        // Day of week special phrases
        if (dayOfWeek === 1) { // Monday
            selected.phrases.push("Happy Monday! Let's conquer this week's grammar.");
            selected.phrases.push("Start the week strong with some fresh verbs.");
        } else if (dayOfWeek === 3) { // Wednesday
            selected.phrases.push("Happy Hump Day! You're halfway through the week's linguistic journey.");
        } else if (dayOfWeek === 5) { // Friday
            selected.phrases.push("Happy Friday! Perfect day to polish those phonemes.");
            selected.phrases.push("The weekend is near! Time for some relaxed dictionary building.");
        } else if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
            selected.phrases.push("Weekend worldbuilding time!");
            selected.phrases.push("Grab a beverage, it's a great day to expand the lexicon.");
        }

        // Holidays (Overrides base greeting and limits phrases to festive ones)
        if (month === 0 && date === 1) { // Jan 1
            selected.base = "Happy New Year";
            selected.phrases = ["A whole new year for worldbuilding!", "365 new days to expand your lexicon.", "New year, new phonemes!"];
            selected.Icon = Sparkles;
        } else if (month === 1 && date === 14) { // Feb 14
            selected.base = "Happy Valentine's Day";
            selected.phrases = ["A language of love.", "Time to invent 50 words for 'snow', and 100 for 'love'.", "Expressing affection in your own words."];
            selected.Icon = Heart;
        } else if (month === 4 && date === 4) { // May 4
            selected.base = "May the 4th be with you";
            selected.phrases = ["Ready to build the next Huttese?", "Time to craft some sci-fi jargon.", "A great day to work on your galactic lingua franca."];
            selected.Icon = Sparkles;
        } else if (month === 9 && date === 31) { // Oct 31
            selected.base = "Happy Halloween";
            selected.phrases = ["Spooky words are brewing in the cauldron.", "Time for some terrifying tongue-twisters.", "Crafting languages in the dark..."];
            selected.Icon = Flame;
        } else if (month === 11 && date === 25) { // Dec 25
            selected.base = "Merry Christmas";
            selected.phrases = ["Unwrap a new grammar rule!", "Spreading linguistic joy this season.", "A festive day for worldbuilding."];
            selected.Icon = Sparkles;
        } else if (month === 11 && date === 31) { // Dec 31
            selected.base = "Happy New Year's Eve";
            selected.phrases = ["Ready to count down in your conlang?", "Finishing the year strong with one last lexicon entry."];
            selected.Icon = Sparkles;
        }

        const randomPhrase = selected.phrases[Math.floor(Math.random() * selected.phrases.length)];

        setGreeting({
            base: selected.base,
            subtext: randomPhrase,
            Icon: selected.Icon
        });
    }, []);

    const IconComponent = greeting.Icon;
    
    // Check if the user has completed their flashcards today
    const studiedToday = lastStudyDate === new Date().toDateString();

    // Generate a pseudo-random word of the day that changes every 24 hours
    const wordOfTheDay = useMemo(() => {
        if (lexicon.length === 0) return null;
        
        const today = new Date().toDateString();
        let hash = 0;
        for (let i = 0; i < today.length; i++) {
            hash = today.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const index = Math.abs(hash) % lexicon.length;
        return lexicon[index];
    }, [lexicon]);

    return (
        <>

        
        <div className="home-container">
            {/* Main Welcome Dashboard */}
            <Card className='home-page'>
                <h1>
                    {greeting.base}<span>, {authorName}</span>
                    <IconComponent className='icon-home'/>
                </h1>
                <p>{greeting.subtext}</p>  
                <div className="home-actions">
                    <button onClick={() => navigate('/settings')} className="btn btn-base btn-primary">
                        <Settings2 size={18} /> Configure Grammar
                    </button>
                    <button onClick={() => navigate('/create')} className="btn btn-base btn-secondary">
                        <PlusCircle size={18} /> Expand Lexicon
                    </button>
                    <button onClick={() => navigate('/lexicon')} className="btn btn-base btn-secondary">
                        <BookA size={18} /> Open Lexicon
                    </button>
                </div>
            </Card> 

            {/* Interactive Widgets Grid */}
            <div className="widgets-grid">
                
                {/* Quick Word Creation */}
                <Card 
                    className="interactive-card help-card"
                    onClick={() => navigate('/help')} 
                >
                    <h3>
                        <HelpCircle size={24} /> Build Guide
                    </h3>
                    <p>New to conlanging? Read our comprehensive guide on how to build a language from scratch.</p>
                    <div className="widget-footer">
                        Open Guide <ArrowRight size={16} />
                    </div>
                </Card>

                {/* Flashcards & Gamification Status */}
                <Card 
                    className="interactive-card training-card"
                    onClick={() => navigate('/study')} 
                >
                    <h3>
                        <BrainCircuit size={24} /> Daily Training
                    </h3>
                    {studiedToday ? (
                        <p>
                            You've studied today! Your streak is at <b className="streak-text"><Flame size={14} className="streak-icon"/> {streak}</b>. Awesome job!
                        </p>
                    ) : (
                        <p>
                            Your flashcards are waiting. Practice now to keep your <b className="streak-text"><Flame size={14} className="streak-icon"/> {streak}</b> day streak alive!
                        </p>
                    )}
                    <div className="widget-footer">
                        Practice Now <ArrowRight size={16} />
                    </div>
                </Card>

                {/* Word of the Day */}
                <Card 
                    className="interactive-card wotd-card"
                    onClick={() => navigate('/lexicon')} 
                >
                    <h3>
                        <Bookmark size={24} /> Word of the Day
                    </h3>
                    {wordOfTheDay ? (
                        <div className="wotd-content">
                            <div className="wotd-display">
                                <span className={`notranslate wotd-word${isFeaturalBlock ? '' : ' custom-font-text'}`}>
                                    {isFeaturalBlock
                                        ? wordOfTheDay.word.replace(/\*/g, '')
                                        : transliterate(wordOfTheDay.word.replace(/\*/g, ''), lexicon)
                                    }
                                </span>
                                <span className="wotd-translation">
                                    {wordOfTheDay.wordClass ? `[${wordOfTheDay.wordClass}] ` : ''}{wordOfTheDay.translation}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p>Add words to your lexicon to reveal your daily featured word!</p>
                    )}
                    <div className="widget-footer">
                        Open Lexicon <ArrowRight size={16} />
                    </div>
                </Card>

                {/* Grammar Wiki */}
                <Card 
                    className="interactive-card wiki-card"
                    onClick={() => navigate('/wiki')} 
                >
                    <h3>
                        <Library size={24} /> Grammar Wiki
                    </h3>
                    <p>Document your phonology, syntax rules, and worldbuilding lore.</p>
                    <div className="widget-footer">
                        Open Wiki <ArrowRight size={16} />
                    </div>
                </Card>

                {/* Support the Project */}
                <Card className="interactive-card support-card">
                    <h3>
                        <Heart size={24} /> Support the Project
                    </h3>
                    <p>Help keep Conlang Engine alive and unlock <b>Cloud Sync</b> + <b>Multi-device backups</b>.</p>
                    <div className="support-card-actions">
                        <button onClick={() => window.open('https://ko-fi.com/kaitosz', '_blank')} className="support-link-btn">
                            <Coffee size={14} /> Ko-fi
                        </button>
                    </div>
                </Card>

            </div>
        </div>
        </>
    );
}
