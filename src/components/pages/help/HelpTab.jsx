import React, { useState } from 'react';
import { Info, BookOpen, HelpCircle, Mail } from 'lucide-react';
import Button from '../../UI/Buttons/Buttons.jsx'; // Using our custom Button component
import './helptab.css';

// --- Sub-components for each tab's content ---

// The About section gives a quick intro to the application
const About = () => (
    <div className="help-section">
        <h3 className="help-section-title"><Info className="help-icon" /> About ConlangEngine</h3>
        <p>Welcome to <strong>ConlangEngine</strong>! This tool is built by conlangers, for conlangers.</p>
        <p>ConlangEngine provides a unified, blazing-fast, local-first workspace to build, manage, and evolve your constructed languages. Instead of scattering your conlang across spreadsheets and text documents, you can use our built-in Dictionary, Grammar engine, Word Generator, and Text Analyzer all in one place.</p>
        <p>Your data is stored locally in your browser by default, meaning you can work offline with zero lag. You can also export your work to JSON or PDF at any time, or use our Cloud Sync (LIVE) features to backup and sync your work across devices.</p>
    </div>
);

// The How to Use section will hold tutorials or basic feature walkthroughs
const HowToUse = () => (
    <div className="help-section">
        <h3 className="help-section-title"><BookOpen className="help-icon" /> How to Use</h3>
        <div className="help-guide-grid">
            <div className="guide-card">
                <h4>1. Start with Settings</h4>
                <p>Head over to the <strong>Settings</strong> tab to define your language's Phonology (vowels, consonants, phonotactics) and Grammar rules. This lays the foundation for auto-generation.</p>
            </div>
            <div className="guide-card">
                <h4>2. Generate or Create Words</h4>
                <p>Use the <strong>Generator</strong> to rapidly build new roots based on your phonotactics, or use <strong>Create Word</strong> to manually add specific vocabulary.</p>
            </div>
            <div className="guide-card">
                <h4>3. Build your Lexicon</h4>
                <p>The <strong>Dictionary</strong> tab acts as your central database. You can search, filter by part of speech, edit roots, and even see auto-generated conjugations via the Inflection Matrix.</p>
            </div>
            <div className="guide-card">
                <h4>4. Analyze & Translate</h4>
                <p>Once you have a vocabulary, use the <strong>Analyzer</strong> and <strong>Reader</strong> to break down sentences, test out translations, and generate interlinear glosses.</p>
            </div>
        </div>
    </div>
);

// The FAQ section answers the most common questions users might have
const FAQ = () => (
    <div className="help-section">
        <h3 className="help-section-title"><HelpCircle className="help-icon" /> Frequently Asked Questions</h3>
        <ul className="help-faq-list">
            <li>
                <strong>Is my data safe if I close the browser?</strong>
                <p>Yes! Your language data is automatically saved locally to your browser's storage. However, we highly recommend using the <strong>Save</strong> button in the top right to download a `.json` backup of your project regularly, just in case you clear your browser cache.</p>
            </li>
            <li>
                <strong>Can I use ConlangEngine offline?</strong>
                <p>Absolutely. The core application runs entirely locally on your device. You only need an internet connection to use Cloud Sync (LIVE) features or to log into your profile.</p>
            </li>
            <li>
                <strong>What does the PDF button do?</strong>
                <p>It automatically compiles your entire language—including phonology rules, grammar configurations, and your full dictionary—into a beautifully formatted PDF document that you can share with others!</p>
            </li>
            <li>
                <strong>How do the auto-derivations work?</strong>
                <p>When you create a word, the engine checks your Grammar Settings for rules that apply to that word's part of speech. It then automatically applies your prefixes/suffixes to show you how the word behaves in your language.</p>
            </li>
        </ul>
    </div>
);

// The Contact section tells users how to reach out for support or feedback
const Contact = () => (
    <div className="help-section">
        <h3 className="help-section-title"><Mail className="help-icon" /> Contact & Community</h3>
        <p>If you have any issues, feature requests, or just want to show off your conlang, we'd love to hear from you!</p>
        <ul className="help-contact-list">
            <li><strong>Email Support:</strong> <span className="help-email">support@conlangengine.com</span></li>
            <li><strong>Community Discord:</strong> <a href="https://discord.gg/9b93D3Wtax" target="_blank" rel="noopener noreferrer" className="help-link">Join our Server</a></li>
            <li><strong>Bug Reports:</strong> <a href="https://github.com/kaitojv/ConlangEngine/" target="_blank" rel="noopener noreferrer" className="help-link">GitHub Repository</a></li>
        </ul>
    </div>
);

export default function HelpTab() {
    // We use this state to remember which tab the user is currently looking at
    const [activeTab, setActiveTab] = useState('about');

    // This little helper function decides which component to show based on the active tab
    const renderTabContent = () => {
        switch (activeTab) {
            case 'about': return <About />;
            case 'how-to-use': return <HowToUse />;
            case 'faq': return <FAQ />;
            case 'contact': return <Contact />;
            default: return <About />;
        }
    };

    return (
        <div className="help-container animate-fade-in">
            <header className="help-header">
                <h2>Help & Information</h2>
                {/* Navigation bar for switching between our help sections */}
                <nav className="help-nav">
                    <Button 
                        onClick={() => setActiveTab('about')} 
                        className={`help-nav-btn ${activeTab === 'about' ? 'active' : ''}`}
                    >
                        <Info size={18} /> About
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('how-to-use')} 
                        className={`help-nav-btn ${activeTab === 'how-to-use' ? 'active' : ''}`}
                    >
                        <BookOpen size={18} /> How to Use
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('faq')} 
                        className={`help-nav-btn ${activeTab === 'faq' ? 'active' : ''}`}
                    >
                        <HelpCircle size={18} /> FAQ
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('contact')} 
                        className={`help-nav-btn ${activeTab === 'contact' ? 'active' : ''}`}
                    >
                        <Mail size={18} /> Contact
                    </Button>
                </nav>
            </header>
            
            {/* Where the actual content gets injected */}
            <div className="help-content">
                {renderTabContent()}
            </div>
        </div>
    );
}