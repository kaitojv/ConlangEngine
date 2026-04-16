// src/components/pages/home/home.jsx
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import FloatingBackground from './FloatingBackground.jsx';
import { Sunrise, Sun, Moon, Sparkles, Settings2, BookA } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Para navegar entre abas no React Router
import Card from '@/components/UI/Card/Card.jsx';
import './home.css';



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
