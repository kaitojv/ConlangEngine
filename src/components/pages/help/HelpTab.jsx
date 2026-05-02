import React, { useState } from 'react';
import { Info, BookOpen, HelpCircle, Mail, Shield, ChevronRight, Lightbulb, Sparkles, PenTool, BookA, Settings2, Wand2, BrainCircuit, Globe, Lock, Database, Eye, Download, Keyboard } from 'lucide-react';
import Button from '../../UI/Buttons/Buttons.jsx';
import './helptab.css';

// --- Sub-components for each tab's content ---

// The About section gives a quick intro to the application
const About = () => (
    <div className="help-section">
        <h3 className="help-section-title"><Info className="help-icon" /> About ConlangEngine</h3>
        <p>Welcome to <strong>ConlangEngine</strong>! This tool is built by conlangers, for conlangers.</p>
        <p>ConlangEngine provides a unified, blazing-fast, local-first workspace to build, manage, and evolve your constructed languages. Instead of scattering your conlang across spreadsheets and text documents, you can use our built-in Dictionary, Grammar engine, Word Generator, and Text Analyzer all in one place.</p>
        <p>Your data is stored locally in your browser by default, meaning you can work offline with zero lag. You can also export your work to JSON or PDF at any time, or use our Cloud Sync (LIVE) features to backup and sync your work across devices.</p>
        
        <div className="help-features-overview">
            <h4 className="help-features-title"><Sparkles size={16} className="help-icon" /> Core Features</h4>
            <div className="help-features-grid">
                <div className="help-feature-chip"><Settings2 size={14} /> Phonology & Grammar Engine</div>
                <div className="help-feature-chip"><BookA size={14} /> Full Dictionary with IPA</div>
                <div className="help-feature-chip"><Wand2 size={14} /> Phonotactic Word Generator</div>
                <div className="help-feature-chip"><BrainCircuit size={14} /> Study Flashcards & Quizzes</div>
                <div className="help-feature-chip"><PenTool size={14} /> Custom Font & Glyph Studio</div>
                <div className="help-feature-chip"><Globe size={14} /> Interlinear Glosser & Reader</div>
                <div className="help-feature-chip"><Download size={14} /> PDF & JSON Export</div>
                <div className="help-feature-chip"><Lock size={14} /> Cloud Sync (LIVE)</div>
            </div>
        </div>
    </div>
);

// Step-by-step walkthrough on building a conlang
const HowToUse = () => (
    <div className="help-section">
        <h3 className="help-section-title"><BookOpen className="help-icon" /> Conlang Development Guide</h3>
        <p className="help-section-subtitle">Follow this roadmap from zero to a fully functional constructed language.</p>
        
        <div className="help-walkthrough">
            {/* Phase 1 */}
            <div className="walkthrough-phase">
                <div className="phase-header">
                    <span className="phase-number">
                        <span>PHASE</span>
                        <span>1</span>
                    </span>
                    <h4 className="phase-title">Foundation — Sound System</h4>
                </div>
                <div className="phase-body">
                    <p>Every language starts with its sounds. Go to <strong>Settings → Phonology</strong> and define:</p>
                    <div className="walkthrough-steps">
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Consonants & Vowels</strong> — What sounds exist in your language? Start small (8-15 consonants, 3-5 vowels) and expand later. Example: <code>p, t, k, m, n, s, l, r</code> and <code>a, e, i, o, u</code>.
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Syllable Pattern</strong> — How can sounds combine? <code>CV</code> (like Japanese: ka, ni, su), <code>CVC</code> (like English: cat, dog), or more complex patterns. Comma-separate multiple: <code>CV, CVC, VC</code>.
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Writing Direction</strong> — Left-to-right, right-to-left, or vertical? This affects how your conlang text is displayed throughout the app.
                            </div>
                        </div>
                    </div>
                    <div className="walkthrough-tip">
                        <Lightbulb size={14} />
                        <span>Tip: Use the <strong>Word Generator</strong> after setting up phonology to quickly test if your sound system produces words you like. If they all sound weird, tweak your consonants/vowels/patterns until it feels right!</span>
                    </div>
                </div>
            </div>

            {/* Phase 2 */}
            <div className="walkthrough-phase">
                <div className="phase-header">
                    <span className="phase-number">
                        <span>PHASE</span>
                        <span>2</span>
                    </span>
                    <h4 className="phase-title">Grammar — Morphology Rules</h4>
                </div>
                <div className="phase-body">
                    <p>Now give your language structure. Go to <strong>Settings → Grammar</strong> and set up:</p>
                    <div className="walkthrough-steps">
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Syntax Order</strong> — Is your language SVO (like English: "I eat fish"), SOV (like Japanese: "I fish eat"), or VSO (like Arabic: "eat I fish")?
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Grammar Rules</strong> — Add affixes for tenses, plurals, cases, etc. Example: add a suffix <code>-ka</code> that applies to nouns for "plural". The engine will automatically conjugate your words.
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Verb Marker</strong> — Define an infinitive marker (like English "-to" or Spanish "-ar/-er/-ir"). This helps the engine strip it before applying conjugation affixes.
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Person Rules</strong> — Set up pronouns and their verb conjugations (1st person singular, 2nd person plural, etc.) using the Person conjugator table.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Phase 3 */}
            <div className="walkthrough-phase">
                <div className="phase-header">
                    <span className="phase-number">
                        <span>PHASE</span>
                        <span>3</span>
                    </span>
                    <h4 className="phase-title">Vocabulary — Building the Lexicon</h4>
                </div>
                <div className="phase-body">
                    <p>Time to create words! You have two approaches:</p>
                    <div className="walkthrough-steps">
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Word Generator</strong> — Go to the Generator tab, click generate, and the engine creates random words that follow your phonotactic rules. Click "Add to Dictionary" on any word you like.
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Manual Creation</strong> — Go to Create Word, type your conlang word, its translation, part of speech, and IPA pronunciation. The engine shows you a live preview of all auto-derivations based on your grammar rules.
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Semantic Tags</strong> — Tag your words (nature, emotion, body, etc.) so you can filter and study them by category later.
                            </div>
                        </div>
                    </div>
                    <div className="walkthrough-tip">
                        <Lightbulb size={14} />
                        <span>Tip: Start with the Swadesh List — a set of ~200 universal concepts (water, fire, eat, sleep, mother, etc.) that every language needs. The <strong>Study Tab's Learning Path</strong> follows this approach!</span>
                    </div>
                </div>
            </div>

            {/* Phase 4 */}
            <div className="walkthrough-phase">
                <div className="phase-header">
                    <span className="phase-number">
                        <span>PHASE</span>
                        <span>4</span>
                    </span>
                    <h4 className="phase-title">Testing — Read & Analyze</h4>
                </div>
                <div className="phase-body">
                    <p>Put your language to the test with real text:</p>
                    <div className="walkthrough-steps">
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Reader & Glosser</strong> — Type a sentence in your conlang and the engine breaks it down word by word, identifying roots, affixes, and translations. Hover over words for detailed breakdowns.
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Library & Writing</strong> — Create wiki articles about your language's lore, grammar notes, and culture. Use "Corpus Text" mode for interlinear translation of longer passages.
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Analyzer</strong> — Paste any conlang word to see how the engine deconstructs it into its morphological components.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Phase 5 */}
            <div className="walkthrough-phase">
                <div className="phase-header">
                    <span className="phase-number">
                        <span>PHASE</span>
                        <span>5</span>
                    </span>
                    <h4 className="phase-title">Polish — Share & Export</h4>
                </div>
                <div className="phase-body">
                    <p>Your language is taking shape! Now make it permanent:</p>
                    <div className="walkthrough-steps">
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Custom Font</strong> — Use the Glyph Studio (Settings → Font) to draw custom characters for your language and compile them into a real .ttf font file!
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>PDF Export</strong> — Click the PDF button in the header to generate a formatted reference document with your entire language.
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>Share Link (LIVE)</strong> — Push to cloud and generate a public reader link so anyone can explore your conlang in a beautiful, read-only showcase page.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Privacy & Security
const Privacy = () => (
    <div className="help-section">
        <h3 className="help-section-title"><Shield className="help-icon" /> Privacy & Data Security</h3>
        <p className="help-section-subtitle">Your conlang is <em>your</em> intellectual property. Here's how we protect it.</p>

        <div className="privacy-grid">
            <div className="privacy-card">
                <div className="privacy-card-icon"><Database size={20} /></div>
                <h4>Local-First Architecture</h4>
                <p>All your data is stored <strong>locally in your browser</strong> by default. Your dictionary, grammar rules, and wiki pages never leave your device unless you explicitly choose to sync to the cloud. No server, no tracking, no telemetry.</p>
            </div>

            <div className="privacy-card">
                <div className="privacy-card-icon"><Lock size={20} /></div>
                <h4>Cloud Sync is Optional & Encrypted</h4>
                <p>Cloud Sync (LIVE) is entirely opt-in. When you push to cloud, your data is stored in a secure <strong>Supabase</strong> database with Row Level Security (RLS) — meaning <strong>only you</strong> can read, modify, or delete your own projects. No other user can access your data.</p>
            </div>

            <div className="privacy-card">
                <div className="privacy-card-icon"><Eye size={20} /></div>
                <h4>We Never Read Your Data</h4>
                <p>ConlangEngine has <strong>zero analytics</strong> on your language content. We don't read, analyze, mine, or sell your words, grammar rules, or wiki articles. Your conlang is not used for AI training or any other purpose. Period.</p>
            </div>

            <div className="privacy-card">
                <div className="privacy-card-icon"><Download size={20} /></div>
                <h4>Full Data Portability</h4>
                <p>You can <strong>export your entire project</strong> as a JSON file or PDF at any time. Your data is never locked in. If you want to leave, take everything with you — no questions asked.</p>
            </div>

            <div className="privacy-card">
                <div className="privacy-card-icon"><Globe size={20} /></div>
                <h4>Share Links Are Opt-In</h4>
                <p>The public reader page (<code>/view/</code>) is only accessible if <strong>you explicitly generate and share the link</strong>. Your project is identified by a unique ID — nobody can discover it by browsing or guessing. You control who sees your work.</p>
            </div>

            <div className="privacy-card">
                <div className="privacy-card-icon"><Shield size={20} /></div>
                <h4>Open Source & Auditable</h4>
                <p>ConlangEngine's codebase is <strong>open source</strong> on GitHub. Anyone can inspect exactly what the app does. There are no hidden trackers, no third-party scripts, and no ads. What you see is what you get.</p>
            </div>
        </div>

        <div className="privacy-summary">
            <strong>In short:</strong> We don't collect your data. We don't sell your data. We don't even <em>look</em> at your data. Your conlang belongs to you — we just build the tools.
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
            <li>
                <strong>What's the difference between the Generator and Create Word?</strong>
                <p>The <strong>Generator</strong> creates random words that follow your phonotactic rules — great for brainstorming. <strong>Create Word</strong> lets you manually define a specific root with its translation, IPA, and tags. You can also send generated words directly to Create Word with one click.</p>
            </li>
            <li>
                <strong>What is LIVE / Cloud Sync?</strong>
                <p>LIVE is an optional premium feature that lets you back up your conlang to the cloud, sync across devices, manage multiple conlang projects, and generate shareable public reader links. Your core tools work fully without it.</p>
            </li>
            <li>
                <strong>Can other people see my conlang?</strong>
                <p>Only if you explicitly generate a Share Link. Your cloud data is protected by Row Level Security — no one can browse, search, or stumble upon your project. Share links use a unique project ID that's practically impossible to guess.</p>
            </li>
            <li>
                <strong>What happens if I clear my browser data?</strong>
                <p>Your locally-stored data will be lost. This is why we strongly recommend either downloading JSON backups regularly or using Cloud Sync. If you've pushed to cloud, you can always pull your project back.</p>
            </li>
        </ul>
    </div>
);

// Keyboard Shortcuts section
const Shortcuts = () => (
    <div className="help-section">
        <h3 className="help-section-title"><Keyboard className="help-icon" /> Keyboard Shortcuts</h3>
        <p>Speed up your workflow with these global hotkeys. These work from anywhere in the app (unless you are typing in an input field).</p>
        <div className="shortcuts-grid">
            <div className="shortcut-item">
                <span className="shortcut-key">Alt + H</span>
                <span className="shortcut-desc">Go to Home</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">Alt + D</span>
                <span className="shortcut-desc">Open Dictionary</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">Alt + C</span>
                <span className="shortcut-desc">Create New Word</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">Alt + G</span>
                <span className="shortcut-desc">Open Generator</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">Alt + A</span>
                <span className="shortcut-desc">Open Text Analyzer</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">Alt + S</span>
                <span className="shortcut-desc">Open Settings</span>
            </div>
        </div>
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
            case 'privacy': return <Privacy />;
            case 'faq': return <FAQ />;
            case 'shortcuts': return <Shortcuts />;
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
                        <BookOpen size={18} /> Build Guide
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('privacy')} 
                        className={`help-nav-btn ${activeTab === 'privacy' ? 'active' : ''}`}
                    >
                        <Shield size={18} /> Privacy
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('faq')} 
                        className={`help-nav-btn ${activeTab === 'faq' ? 'active' : ''}`}
                    >
                        <HelpCircle size={18} /> FAQ
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('shortcuts')} 
                        className={`help-nav-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
                    >
                        <Keyboard size={18} /> Shortcuts
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