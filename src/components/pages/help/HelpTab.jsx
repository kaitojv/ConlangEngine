import React, { useState } from 'react';
import { Info, BookOpen, HelpCircle, Mail, Shield, ChevronRight, Lightbulb, Sparkles, PenTool, BookA, Settings2, Wand2, BrainCircuit, Globe, Lock, Database, Eye, Download, Keyboard, Search, Heart } from 'lucide-react';
import Button from '../../UI/Buttons/Buttons.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import './helptab.css';

// --- Sub-components for each tab's content ---

// The About section gives a quick intro to the application
const About = ({ t }) => (
    <div className="help-section">
        <h3 className="help-section-title"><Info className="help-icon" /> {t('help.about.title')}</h3>
        <p>{t('help.about.welcome')}</p>
        <p>{t('help.about.desc1')}</p>
        <p>{t('help.about.desc2')}</p>
        
        <div className="help-features-overview">
            <h4 className="help-features-title"><Sparkles size={16} className="help-icon" /> {t('help.about.featuresTitle')}</h4>
            <div className="help-features-grid">
                <div className="help-feature-chip"><Settings2 size={14} /> {t('help.about.features.phonologyGrammar')}</div>
                <div className="help-feature-chip"><BookA size={14} /> {t('help.about.features.dictionaryIpa')}</div>
                <div className="help-feature-chip"><Wand2 size={14} /> {t('help.about.features.wordGenerator')}</div>
                <div className="help-feature-chip"><BrainCircuit size={14} /> {t('help.about.features.studyQuizzes')}</div>
                <div className="help-feature-chip"><PenTool size={14} /> {t('help.about.features.fontGlyphs')}</div>
                <div className="help-feature-chip"><Globe size={14} /> {t('help.about.features.glosserReader')}</div>
                <div className="help-feature-chip"><Download size={14} /> {t('help.about.features.export')}</div>
                <div className="help-feature-chip"><Lock size={14} /> {t('help.about.features.cloudSync')}</div>
            </div>
        </div>
    </div>
);

// Step-by-step walkthrough on building a conlang
const HowToUse = ({ t }) => (
    <div className="help-section">
        <h3 className="help-section-title"><BookOpen className="help-icon" /> {t('help.guide.title')}</h3>
        <p className="help-section-subtitle">{t('help.guide.subtitle')}</p>
        
        <div className="help-walkthrough">
            {/* Phase 1 */}
            <div className="walkthrough-phase">
                <div className="phase-header">
                    <span className="phase-number">
                        <span>{t('help.guide.phase')}</span>
                        <span>1</span>
                    </span>
                    <h4 className="phase-title">{t('help.guide.phase1.title')}</h4>
                </div>
                <div className="phase-body">
                    <p>{t('help.guide.phase1.desc')}</p>
                    <div className="walkthrough-steps">
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase1.step1Term')}</strong> — {t('help.guide.phase1.step1Text')}
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase1.step2Term')}</strong> — {t('help.guide.phase1.step2Text')}
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase1.step3Term')}</strong> — {t('help.guide.phase1.step3Text')}
                            </div>
                        </div>
                    </div>
                    <div className="walkthrough-tip">
                        <Lightbulb size={14} />
                        <span>{t('help.guide.phase1.tip')}</span>
                    </div>
                </div>
            </div>

            {/* Phase 2 */}
            <div className="walkthrough-phase">
                <div className="phase-header">
                    <span className="phase-number">
                        <span>{t('help.guide.phase')}</span>
                        <span>2</span>
                    </span>
                    <h4 className="phase-title">{t('help.guide.phase2.title')}</h4>
                </div>
                <div className="phase-body">
                    <p>{t('help.guide.phase2.desc')}</p>
                    <div className="walkthrough-steps">
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase2.step1Term')}</strong> — {t('help.guide.phase2.step1Text')}
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase2.step2Term')}</strong> — {t('help.guide.phase2.step2Text')}
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase2.step3Term')}</strong> — {t('help.guide.phase2.step3Text')}
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase2.step4Term')}</strong> — {t('help.guide.phase2.step4Text')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Phase 3 */}
            <div className="walkthrough-phase">
                <div className="phase-header">
                    <span className="phase-number">
                        <span>{t('help.guide.phase')}</span>
                        <span>3</span>
                    </span>
                    <h4 className="phase-title">{t('help.guide.phase3.title')}</h4>
                </div>
                <div className="phase-body">
                    <p>{t('help.guide.phase3.desc')}</p>
                    <div className="walkthrough-steps">
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase3.step1Term')}</strong> — {t('help.guide.phase3.step1Text')}
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase3.step2Term')}</strong> — {t('help.guide.phase3.step2Text')}
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase3.step3Term')}</strong> — {t('help.guide.phase3.step3Text')}
                            </div>
                        </div>
                    </div>
                    <div className="walkthrough-tip">
                        <Lightbulb size={14} />
                        <span>{t('help.guide.phase3.tip')}</span>
                    </div>
                </div>
            </div>

            {/* Phase 4 */}
            <div className="walkthrough-phase">
                <div className="phase-header">
                    <span className="phase-number">
                        <span>{t('help.guide.phase')}</span>
                        <span>4</span>
                    </span>
                    <h4 className="phase-title">{t('help.guide.phase4.title')}</h4>
                </div>
                <div className="phase-body">
                    <p>{t('help.guide.phase4.desc')}</p>
                    <div className="walkthrough-steps">
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase4.step1Term')}</strong> — {t('help.guide.phase4.step1Text')}
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase4.step2Term')}</strong> — {t('help.guide.phase4.step2Text')}
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase4.step3Term')}</strong> — {t('help.guide.phase4.step3Text')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Phase 5 */}
            <div className="walkthrough-phase">
                <div className="phase-header">
                    <span className="phase-number">
                        <span>{t('help.guide.phase')}</span>
                        <span>5</span>
                    </span>
                    <h4 className="phase-title">{t('help.guide.phase5.title')}</h4>
                </div>
                <div className="phase-body">
                    <p>{t('help.guide.phase5.desc')}</p>
                    <div className="walkthrough-steps">
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase5.step1Term')}</strong> — {t('help.guide.phase5.step1Text')}
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase5.step2Term')}</strong> — {t('help.guide.phase5.step2Text')}
                            </div>
                        </div>
                        <div className="walkthrough-step">
                            <ChevronRight size={14} className="step-icon" />
                            <div>
                                <strong>{t('help.guide.phase5.step3Term')}</strong> — {t('help.guide.phase5.step3Text')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Privacy & Security
const Privacy = ({ t }) => (
    <div className="help-section">
        <h3 className="help-section-title"><Shield className="help-icon" /> {t('help.privacy.title')}</h3>
        <p className="help-section-subtitle">{t('help.privacy.subtitle')}</p>

        <div className="privacy-grid">
            <div className="privacy-card">
                <div className="privacy-card-icon"><Database size={20} /></div>
                <h4>{t('help.privacy.localFirstTitle')}</h4>
                <p>{t('help.privacy.localFirstText')}</p>
            </div>

            <div className="privacy-card">
                <div className="privacy-card-icon"><Lock size={20} /></div>
                <h4>{t('help.privacy.cloudSyncTitle')}</h4>
                <p>{t('help.privacy.cloudSyncText')}</p>
            </div>

            <div className="privacy-card">
                <div className="privacy-card-icon"><Eye size={20} /></div>
                <h4>{t('help.privacy.neverReadTitle')}</h4>
                <p>{t('help.privacy.neverReadText')}</p>
            </div>

            <div className="privacy-card">
                <div className="privacy-card-icon"><Download size={20} /></div>
                <h4>{t('help.privacy.portabilityTitle')}</h4>
                <p>{t('help.privacy.portabilityText')}</p>
            </div>

            <div className="privacy-card">
                <div className="privacy-card-icon"><Globe size={20} /></div>
                <h4>{t('help.privacy.shareLinksTitle')}</h4>
                <p>{t('help.privacy.shareLinksText')}</p>
            </div>

            <div className="privacy-card">
                <div className="privacy-card-icon"><Shield size={20} /></div>
                <h4>{t('help.privacy.openSourceTitle')}</h4>
                <p>{t('help.privacy.openSourceText')}</p>
            </div>
        </div>

        <div className="privacy-summary">
            <strong>{t('help.privacy.inShort')}</strong> {t('help.privacy.summaryText')}
        </div>
    </div>
);

// The FAQ section answers the most common questions users might have
const FAQ = ({ t }) => (
    <div className="help-section">
        <h3 className="help-section-title"><HelpCircle className="help-icon" /> {t('help.faq.title')}</h3>
        <ul className="help-faq-list">
            <li>
                <strong>{t('help.faq.q1Title')}</strong>
                <p>{t('help.faq.q1Answer')}</p>
            </li>
            <li>
                <strong>{t('help.faq.q2Title')}</strong>
                <p>{t('help.faq.q2Answer')}</p>
            </li>
            <li>
                <strong>{t('help.faq.q3Title')}</strong>
                <p>{t('help.faq.q3Answer')}</p>
            </li>
            <li>
                <strong>{t('help.faq.q4Title')}</strong>
                <p>{t('help.faq.q4Answer')}</p>
            </li>
            <li>
                <strong>{t('help.faq.q5Title')}</strong>
                <p>{t('help.faq.q5Answer')}</p>
            </li>
            <li>
                <strong>{t('help.faq.q6Title')}</strong>
                <p>{t('help.faq.q6Answer')}</p>
            </li>
            <li>
                <strong>{t('help.faq.q7Title')}</strong>
                <p>{t('help.faq.q7Answer')}</p>
            </li>
            <li>
                <strong>{t('help.faq.q8Title')}</strong>
                <p>{t('help.faq.q8Answer')}</p>
            </li>
        </ul>
    </div>
);

// Keyboard Shortcuts section
const Shortcuts = ({ t }) => (
    <div className="help-section">
        <h3 className="help-section-title"><Keyboard className="help-icon" /> {t('help.shortcuts.title')}</h3>
        <p>{t('help.shortcuts.desc')}</p>
        <div className="shortcuts-grid">
            <div className="shortcut-item">
                <span className="shortcut-key">Alt + H</span>
                <span className="shortcut-desc">{t('help.shortcuts.home')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">Alt + D</span>
                <span className="shortcut-desc">{t('help.shortcuts.dictionary')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">Alt + C</span>
                <span className="shortcut-desc">{t('help.shortcuts.createWord')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">Alt + G</span>
                <span className="shortcut-desc">{t('help.shortcuts.generator')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">Alt + A</span>
                <span className="shortcut-desc">{t('help.shortcuts.analyzer')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">Alt + S</span>
                <span className="shortcut-desc">{t('help.shortcuts.settings')}</span>
            </div>
        </div>
    </div>
);

// Searching the Lexicon — documents the search modes of the Dictionary search box
const Searching = ({ t }) => (
    <div className="help-section help-searching">
        <h3 className="help-section-title"><Search className="help-icon" /> {t('help.searching.title')}</h3>
        <p className="help-section-subtitle">{t('help.searching.subtitle')}</p>

        <h4>{t('help.searching.standardTitle')}</h4>
        <p>{t('help.searching.standardText')}</p>

        <h4>{t('help.searching.phonemeSearch') || t('help.searching.phonemeTitle')}</h4>
        <p>{t('help.searching.phonemeDesc')}</p>
        <div className="shortcuts-grid">
            <div className="shortcut-item">
                <span className="shortcut-key">t, kʰ, t͡ʃ</span>
                <span className="shortcut-desc">{t('help.searching.itemIpa')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">C / V</span>
                <span className="shortcut-desc">{t('help.searching.itemCv')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">[features]</span>
                <span className="shortcut-desc">{t('help.searching.itemBundle')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">*</span>
                <span className="shortcut-desc">{t('help.searching.itemStar')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">#</span>
                <span className="shortcut-desc">{t('help.searching.itemBoundary')}</span>
            </div>
        </div>
        <p>{t('help.searching.examplesDesc')}</p>
        <div className="shortcuts-grid">
            <div className="shortcut-item">
                <span className="shortcut-key">/#st</span>
                <span className="shortcut-desc">{t('help.searching.exStartSt')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">/n#</span>
                <span className="shortcut-desc">{t('help.searching.exEndN')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">/VnV</span>
                <span className="shortcut-desc">{t('help.searching.exVnV')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">/[nasal]V#</span>
                <span className="shortcut-desc">{t('help.searching.exNasalV')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">/[+voiced, fricative]</span>
                <span className="shortcut-desc">{t('help.searching.exVoicedFric')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">/#CVCV#</span>
                <span className="shortcut-desc">{t('help.searching.exExactCvcv')}</span>
            </div>
        </div>
        <p>{t('help.searching.bundleHelp')}</p>
        <div className="walkthrough-tip">
            <Lightbulb size={14} />
            <span>{t('help.searching.diacriticsTip')}</span>
        </div>

        <h4>{t('help.searching.reverseTitle')}</h4>
        <p>{t('help.searching.reverseDesc')}</p>
        <div className="shortcuts-grid">
            <div className="shortcut-item">
                <span className="shortcut-key">=water</span>
                <span className="shortcut-desc">{t('help.searching.exWater')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">=to run</span>
                <span className="shortcut-desc">{t('help.searching.exToRun')}</span>
            </div>
            <div className="shortcut-item">
                <span className="shortcut-key">=happy</span>
                <span className="shortcut-desc">{t('help.searching.exHappy')}</span>
            </div>
        </div>
        <div className="walkthrough-tip">
            <Lightbulb size={14} />
            <span>{t('help.searching.offlineTip')}</span>
        </div>
    </div>
);

// The Contact section tells users how to reach out for support or feedback
const Contact = ({ t }) => (
    <div className="help-section">
        <h3 className="help-section-title"><Mail className="help-icon" /> {t('help.contact.title')}</h3>
        <p>{t('help.contact.desc')}</p>
        <ul className="help-contact-list">
            <li><strong>{t('help.contact.emailSupport')}</strong> <span className="help-email">support@conlangengine.com</span></li>
            <li><strong>{t('help.contact.communityDiscord')}</strong> <a href="https://discord.gg/9b93D3Wtax" target="_blank" rel="noopener noreferrer" className="help-link">{t('help.contact.joinServer')}</a></li>
            <li><strong>{t('help.contact.bugReports')}</strong> <a href="https://github.com/kaitojv/ConlangEngine/" target="_blank" rel="noopener noreferrer" className="help-link">{t('help.contact.githubRepo')}</a></li>
        </ul>
    </div>
);

// The Thanks section for acknowledgements
const Thanks = ({ t }) => (
    <div className="help-section">
        <h3 className="help-section-title"><Heart className="help-icon" /> {t('help.thanks.title')}</h3>
        <p>{t('help.thanks.desc')}</p>
        <ul className="help-faq-list">
            <li>
                <strong>{t('help.thanks.familyFriendsTitle')}</strong>
                <p>{t('help.thanks.familyFriendsDesc')}</p>
            </li>
            <li>
                <strong>{t('help.thanks.discordTitle')}</strong>
                <p>{t('help.thanks.discordDesc')}</p>
            </li>
            <li>
                <strong>{t('help.thanks.slapstickTitle')}</strong>
                <p>{t('help.thanks.slapstickDesc')}</p>
            </li>
            <li>
                <strong>{t('help.thanks.niruhsaTitle')}</strong>
                <p>{t('help.thanks.niruhsaDesc')}</p>
            </li>
        </ul>
    </div>
);

export default function HelpTab() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('about');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'about': return <About t={t} />;
            case 'how-to-use': return <HowToUse t={t} />;
            case 'privacy': return <Privacy t={t} />;
            case 'faq': return <FAQ t={t} />;
            case 'searching': return <Searching t={t} />;
            case 'shortcuts': return <Shortcuts t={t} />;
            case 'contact': return <Contact t={t} />;
            case 'thanks': return <Thanks t={t} />;
            default: return <About t={t} />;
        }
    };

    return (
        <div className="help-container animate-fade-in">
            <header className="help-header">
                <h2>{t('help.title')}</h2>
                {/* Navigation bar for switching between our help sections */}
                <nav className="help-nav">
                    <Button 
                        onClick={() => setActiveTab('about')} 
                        className={`help-nav-btn ${activeTab === 'about' ? 'active' : ''}`}
                    >
                        <Info size={18} /> {t('help.nav.about')}
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('how-to-use')} 
                        className={`help-nav-btn ${activeTab === 'how-to-use' ? 'active' : ''}`}
                    >
                        <BookOpen size={18} /> {t('help.nav.buildGuide')}
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('privacy')} 
                        className={`help-nav-btn ${activeTab === 'privacy' ? 'active' : ''}`}
                    >
                        <Shield size={18} /> {t('help.nav.privacy')}
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('faq')} 
                        className={`help-nav-btn ${activeTab === 'faq' ? 'active' : ''}`}
                    >
                        <HelpCircle size={18} /> {t('help.nav.faq')}
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('searching')} 
                        className={`help-nav-btn ${activeTab === 'searching' ? 'active' : ''}`}
                    >
                        <Search size={18} /> {t('help.nav.searching')}
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('shortcuts')} 
                        className={`help-nav-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
                    >
                        <Keyboard size={18} /> {t('help.nav.shortcuts')}
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('contact')} 
                        className={`help-nav-btn ${activeTab === 'contact' ? 'active' : ''}`}
                    >
                        <Mail size={18} /> {t('help.nav.contact')}
                    </Button>
                    <Button 
                        onClick={() => setActiveTab('thanks')} 
                        className={`help-nav-btn ${activeTab === 'thanks' ? 'active' : ''}`}
                    >
                        <Heart size={18} /> {t('help.nav.thanks')}
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