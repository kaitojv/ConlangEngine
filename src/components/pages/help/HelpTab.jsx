import React, { useState } from 'react';
import { Info, BookOpen, HelpCircle, Mail } from 'lucide-react';
import Button from '../../UI/Buttons/Buttons.jsx'; // Using our custom Button component
import './helptab.css';

// --- Sub-components for each tab's content ---

// The About section gives a quick intro to the application
const About = () => (
    <div className="help-section">
        <h3 className="help-section-title"><Info className="help-icon" /> About ConlangEngine</h3>
        <p>Welcome to ConlangEngine! This tool is designed to help you build, manage, and evolve your constructed languages in a unified workspace.</p>
    </div>
);

// The How to Use section will hold tutorials or basic feature walkthroughs
const HowToUse = () => (
    <div className="help-section">
        <h3 className="help-section-title"><BookOpen className="help-icon" /> How to Use</h3>
        <p>Here you can find instructions on how to use the various features of ConlangEngine.</p>
        {/* You can add your tutorial steps or guide here */}
    </div>
);

// The FAQ section answers the most common questions users might have
const FAQ = () => (
    <div className="help-section">
        <h3 className="help-section-title"><HelpCircle className="help-icon" /> Frequently Asked Questions</h3>
        <ul className="help-faq-list">
            <li><strong>What is a conlang?</strong><p>A constructed language.</p></li>
            <li><strong>Is my data saved?</strong><p>Yes, you can export your project locally as a JSON file or save it directly to the cloud if you have an active session!</p></li>
        </ul>
    </div>
);

// The Contact section tells users how to reach out for support or feedback
const Contact = () => (
    <div className="help-section">
        <h3 className="help-section-title"><Mail className="help-icon" /> Contact Us</h3>
        <p>If you have any issues, feature requests, or feedback, please reach out to us at <strong className="help-email">support@conlangengine.com</strong>.</p>
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