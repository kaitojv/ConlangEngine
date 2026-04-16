// src/components/pages/home/home.jsx

import React, { useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import FloatingBackground from './FloatingBackground.jsx';
import { Sunrise, Sun, Moon, Sparkles, Settings2, BookA, PlusCircle, BrainCircuit, Flame, ArrowRight, Bookmark, Library } from 'lucide-react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import FloatingBackground from './FloatingBackground.jsx';
import { Sunrise, Sun, Moon, Sparkles, Settings2, BookA } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Para navegar entre abas no React Router
import Card from '@/components/UI/Card/Card.jsx';
import './home.css';


export default function Home() {
    const authorName = useConfigStore((state) => state.authorName) || "Creator";
    const conlangName = useConfigStore((state) => state.conlangName) || "your conlang";
    const streak = useConfigStore((state) => state.streak) || 0;
    const lastStudyDate = useConfigStore((state) => state.lastStudyDate);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const navigate = useNavigate();

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        
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

        const selected = greetings[timeOfDay];
        const randomPhrase = selected.phrases[Math.floor(Math.random() * selected.phrases.length)];

        return {
            base: selected.base,
            subtext: randomPhrase,
            Icon: selected.Icon
        };
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
        <FloatingBackground />
        
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
                    <button onClick={() => navigate('/dictionary')} className="btn btn-base btn-secondary">
                        <BookA size={18} /> Open Dictionary
                    </button>
                </div>
            </Card> 

            {/* Interactive Widgets Grid */}
            <div className="widgets-grid">
                
                {/* Quick Word Creation */}
                <Card 
                    className="interactive-card lexicon-card"
                    onClick={() => navigate('/create')} 
                >
                    <h3>
                        <PlusCircle size={24} /> Expand Lexicon
                    </h3>
                    <p>Create a new word for <b>{conlangName}</b> and grow your vocabulary.</p>
                    <div className="widget-footer">
                        Go to Creator <ArrowRight size={16} />
                    </div>
                </Card>

                {/* Flashcards & Gamification Status */}
                <Card 
                    className="interactive-card training-card"
                    onClick={() => navigate('/flashcards')} 
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
                    onClick={() => navigate('/dictionary')} 
                >
                    <h3>
                        <Bookmark size={24} /> Word of the Day
                    </h3>
                    {wordOfTheDay ? (
                        <div className="wotd-content">
                            <div className="wotd-display">
                                <span className="custom-font-text notranslate wotd-word">
                                    {wordOfTheDay.word.replace(/\*/g, '')}
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
                        Open Dictionary <ArrowRight size={16} />
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

            </div>
        </div>
        </>
    );



export default function Home() {
    const authorName = useConfigStore((state) => state.authorName) || "Creator";
    const navigate = useNavigate();

    const getGreeting = () => {
        const hour = new Date().getHours();
        
        if (hour >= 5 && hour < 12) {
            return {
                base: "Good morning",
                subtext: "Early bird catches the root! Ready to build?",
                Icon: Sunrise
            };
        } else if (hour >= 12 && hour < 18) {
            return {
                base: "Good afternoon",
                subtext: "Welcome back to your linguistic laboratory.",
                Icon: Sun
            };
        } else if (hour >= 18 && hour < 22) {
            return {
                base: "Good evening",
                subtext: "Dusk is falling. Perfect time to review your grammar.",
                Icon: Moon
            };
        } else {
            return {
                base: "Hello night owl",
                subtext: "Late night inspiration? Let's craft some words.",
                Icon: Sparkles
            };
        }

    
    };

    const greeting = getGreeting();
    const IconComponent = greeting.Icon;

  return (


      
      <>
      <FloatingBackground />
        <Card className='home-page'>
          <h1>
             {greeting.base}
              <span>
                ,  {authorName} 
                  
              </span>
               <IconComponent className='icon-home'/>
          </h1>
          <p>
              {greeting.subtext}
          </p>  
                    <div >
                        
                        <button 
                            onClick={() => navigate('/settings')} 
                            className="btn btn-base bg-[var(--acc)]"
                        >
                            <Settings2 /> Configure Grammar
                        </button>
                        
                        <button 
                            onClick={() => navigate('/dictionary')} 
                            className="btn btn-base bg-transparent text-[var(--tx)]"
                        >
                            <BookA className="w-5 h-5" /> Open Dictionary
                        </button>
                    </div>
        </Card> 
      </>
    )
}
