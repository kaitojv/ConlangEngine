//src/App.jsx

//Imports
import React, { useState, Suspense, lazy } from 'react';
import Header from './components/Layout/Header/Header.jsx';
import { useConfigStore } from './store/useConfigStore.jsx';
import './index.css';
import NavBar from './components/Layout/NavBar/Navbar.jsx';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useThemeInjector } from './hooks/useThemeInjector.jsx';
import { useFontInjector } from './utils/useFontInjector.jsx';
import { useGlobalHotkeys } from './hooks/useGlobalHotkeys.jsx';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion.jsx';
import { useBackupManager } from './hooks/useBackupManager.jsx';
import { useAutoSync } from './hooks/useAutoSync.jsx';
import SyncConflictManager from './components/pages/home/SyncConflictManager.jsx';
import Footer from './components/Layout/Footer/Footer.jsx';
import FloatingKeyboard from './components/UI/FloatingKeyboard/FloatingKeyboard.jsx';
import FloatingBackground from './components/pages/home/FloatingBackground.jsx';
import PWAInstallPrompt from './components/UI/PWAInstallPrompt/PWAInstallPrompt.jsx';
import CommandPalette from './components/UI/CommandPalette/CommandPalette.jsx';
import PageSkeleton from './components/UI/PageSkeleton/PageSkeleton.jsx';
import ErrorBoundary from './components/UI/ErrorBoundary/ErrorBoundary.jsx';
import { AnimatePresence, motion } from 'framer-motion';

import { Toaster } from 'react-hot-toast';

// Lazy loading pages for better performance
const Home = lazy(() => import('./components/pages/home/Home.jsx'));
const Lexicon = lazy(() => import('./components/pages/dictionary/LexiconList.jsx'));
const Settings = lazy(() => import('./components/pages/settings/Settings.jsx'));
const CreateWordTab = lazy(() => import('./components/pages/create/CreateWordTab.jsx'));
const GeneratorTab = lazy(() => import('./components/pages/wordgenerator/GeneratorTab.jsx'));
const EtymologyTab = lazy(() => import('./components/pages/rootmap/EtymologyTab.jsx'));
const AnalyzerTab = lazy(() => import('./components/pages/analyzer/AnalyzerTab.jsx'));
const GlosserTab = lazy(() => import('./components/pages/glosser/GlosserTab.jsx'));
const WikiTab = lazy(() => import('./components/pages/wiki/WikiTab.jsx'));
const StudyTab = lazy(() => import('./components/pages/study/StudyTab.jsx'));
const ProfileTab = lazy(() => import('./components/pages/profile/ProfileTab.jsx'));
const ConlangsTab = lazy(() => import('./components/pages/conlangstab/ConlangsTab.jsx'));
const HelpTab = lazy(() => import('./components/pages/help/HelpTab.jsx'));
const PublicViewer = lazy(() => import('./components/pages/viewer/PublicViewer.jsx'));
const AlignerTab = lazy(() => import('./components/pages/aligner/AlignerTab.jsx'));
const OrthographyPage = lazy(() => import('./components/pages/orthography/OrthographyPage.jsx'));
const SemanticExplorer = lazy(() => import('./components/pages/lexicon/SemanticExplorer.jsx'));
const ExplorePage = lazy(() => import('./components/pages/explore/ExplorePage.jsx'));
const OnboardingWizard = lazy(() => import('./components/pages/onboarding/OnboardingWizard.jsx'));
const PhrasesTab = lazy(() => import('./components/pages/phrases/PhrasesTab.jsx'));
const HowToStart = lazy(() => import('./components/pages/howtostart/HowToStart.jsx'));
const TypologyTab = lazy(() => import('./components/pages/typology/TypologyTab.jsx'));

// Animation wrapper for routes
const AnimatedPage = ({ children }) => {
  // Honour the OS reduced-motion setting: drop the slide/fade entirely
  // rather than shortening it, so no large-area movement is animated.
  const prefersReducedMotion = usePrefersReducedMotion();
  if (prefersReducedMotion) return <div style={{ height: '100%' }}>{children}</div>;

  return (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ duration: 0.25, ease: "easeInOut" }}
    style={{ height: '100%' }}
  >
    {children}
  </motion.div>
  );
};

function App(){

  const location = useLocation();
  const navigate = useNavigate();
  const isPublicView = location.pathname.startsWith('/view/');

  const[openMenu, setOpenMenu] = useState(false);
  const customFontBase64 = useConfigStore(state => state.customFontBase64);
  const rawWritingDirection = useConfigStore(state => state.writingDirection) || 'ltr';

  // SEC-3: Allowlist writingDirection to prevent CSS injection
  const VALID_DIRECTIONS = ['ltr', 'rtl', 'vertical-rl', 'vertical-lr'];
  const writingDirection = VALID_DIRECTIONS.includes(rawWritingDirection) ? rawWritingDirection : 'ltr';
  const projectId = useConfigStore(state => state.projectId);
  const rehydrateBloat = useConfigStore(state => state.rehydrateBloat);
  const isRehydrating = useConfigStore(state => state.isRehydrating);
  const purgeBloatedGlyphs = useConfigStore(state => state.purgeBloatedGlyphs);
  const hasCompletedOnboarding = useConfigStore(state => state.hasCompletedOnboarding);
  
  const appLanguage = useConfigStore(state => state.appLanguage) || 'en';

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = appLanguage;
    }
  }, [appLanguage]);

  React.useEffect(() => {
      if (!projectId) {
          useConfigStore.getState().updateConfig({ projectId: `local_${Date.now()}` });
      } else {
          rehydrateBloat();
      }
  }, [projectId, rehydrateBloat]);

  // Redirect to onboarding if they haven't completed it
  React.useEffect(() => {
      if (hasCompletedOnboarding === false && location.pathname === '/') {
          navigate('/onboarding');
      }
  }, [hasCompletedOnboarding, location.pathname, navigate]);

  React.useEffect(() => {
      if (purgeBloatedGlyphs) purgeBloatedGlyphs();
  }, [purgeBloatedGlyphs]);

  // Auto-compile the block font if missing (e.g. stripped from cloud sync payload to prevent Supabase timeouts)
  const phonologyTypes = useConfigStore(state => state.phonologyTypes);
  const featuralComponents = useConfigStore(state => state.featuralComponents);
  const updateConfig = useConfigStore(state => state.updateConfig);

  React.useEffect(() => {
      if (!isRehydrating && phonologyTypes === 'featural_block' && !customFontBase64) {
          if (featuralComponents && Object.keys(featuralComponents).length > 0) {
              const autoCompile = async () => {
                  try {
                      // Import useLexiconStore to extract lexicon
                      const { useLexiconStore } = await import('./store/useLexiconStore.jsx');
                      const fullConfig = useConfigStore.getState();
                      const lexicon = useLexiconStore.getState().lexicon;
                      // Use Web Worker to prevent UI locking during heavy font generation
                      const worker = new Worker(new URL('./utils/block-compiler-thread.js', import.meta.url), { type: 'module' });
                      
                      worker.onmessage = (e) => {
                          if (e.data.success) {
                              const newData = e.data.result;
                              updateConfig({
                                  syllabaryMap: newData.syllabaryMap,
                                  customFontBase64: newData.customFontBase64,
                                  customFont: newData.customFontBase64,
                                  puaCounter: newData.puaCounter
                              });
                          } else {
                              console.warn("Worker font compile failed:", e.data.error);
                          }
                          worker.terminate();
                      };
                      
                      worker.onerror = (err) => {
                          console.warn("Worker font compile error:", err);
                          worker.terminate();
                      };
                      
                      const cleanConfig = { ...fullConfig, lexicon };
                      delete cleanConfig.customFontBase64;
                      delete cleanConfig.customFont;
                      worker.postMessage({ config: JSON.parse(JSON.stringify(cleanConfig)) });
                  } catch (e) {
                      console.warn("Local auto-compile failed to start:", e);
                  }
              };
              autoCompile();
          }
      }
  }, [isRehydrating, phonologyTypes, customFontBase64, featuralComponents, updateConfig]);

  useThemeInjector();
  useFontInjector();
  useGlobalHotkeys();
  useAutoSync();
  const { backupNow } = useBackupManager();

  return (
    <>

    {/* Automatically updates writing direction for all conlang text, except in public viewer */}
    {!isPublicView && (
      <style>
          {`
              .custom-font-text {
                  writing-mode: ${writingDirection.startsWith('vertical') ? writingDirection : 'horizontal-tb'};
                  direction: ${writingDirection === 'rtl' ? 'rtl' : 'ltr'};
                  ${writingDirection.startsWith('vertical') ? 'text-orientation: upright;' : ''}
              }
              input.custom-font-text, 
              textarea.custom-font-text {
                  writing-mode: horizontal-tb !important;
              }
          `}
      </style>
    )}
      
    

    {/* PUBLIC VIEWER — standalone route with no app shell */}
    {isPublicView ? (
      <ErrorBoundary label="page">
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0b0f19', color: '#94a3b8' }}>Loading...</div>}>
          <Routes>
          <Route path="/view/:projectId" element={<PublicViewer />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    ) : (
      <>
      {isRehydrating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'var(--bg)',
          zIndex: 9999
        }}>
          <PageSkeleton />
        </div>
      )}

    <div className="App">
      <Header openMenu={() => setOpenMenu(true)} onBackupNow={backupNow} />
      <NavBar isMenuOpen={openMenu} closeMenu={() => setOpenMenu(false)} />

      <FloatingBackground />

      <main className={`content ${location.pathname === '/wiki' ? 'wide-content' : ''}`}>
        {/* Boundary sits OUTSIDE the Suspense so it also catches a failed lazy chunk,
            not just throws during render. */}
        <ErrorBoundary label="page">
          <Suspense fallback={<PageSkeleton />}>
            <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />
              <Route path="/explore" element={<AnimatedPage><ExplorePage /></AnimatedPage>} />
              <Route path="/help" element={<AnimatedPage><HelpTab /></AnimatedPage>} />
              <Route path="/onboarding" element={<AnimatedPage><OnboardingWizard /></AnimatedPage>} />
              
              <Route path="/lexicon" element={<AnimatedPage><Lexicon /></AnimatedPage>} />
              <Route path="/conlangs" element={<AnimatedPage><ConlangsTab /></AnimatedPage>} />
              <Route path="/create" element={<AnimatedPage><CreateWordTab /></AnimatedPage>} />
              <Route path="/generator" element={<AnimatedPage><GeneratorTab /></AnimatedPage>} />
              <Route path="/rootmap" element={<AnimatedPage><EtymologyTab /></AnimatedPage>} />
              <Route path="/phrases" element={<AnimatedPage><PhrasesTab /></AnimatedPage>} />
              <Route path="/howtostart" element={<AnimatedPage><HowToStart /></AnimatedPage>} />
              <Route path="/analyzer" element={<AnimatedPage><AnalyzerTab /></AnimatedPage>} />
              <Route path="/typology" element={<AnimatedPage><TypologyTab /></AnimatedPage>} />
              <Route path="/reader" element={<AnimatedPage><GlosserTab /></AnimatedPage>} />
              <Route path="/wiki" element={<AnimatedPage><WikiTab /></AnimatedPage>} />
              <Route path="/study" element={<AnimatedPage><StudyTab /></AnimatedPage>} />
              <Route path="/settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
              <Route path="/profile" element={<AnimatedPage><ProfileTab /></AnimatedPage>} />
              <Route path="/aligner" element={<AnimatedPage><AlignerTab /></AnimatedPage>} />
              <Route path="/orthography" element={<AnimatedPage><OrthographyPage /></AnimatedPage>} />
              <Route path="/semantic" element={<AnimatedPage><SemanticExplorer /></AnimatedPage>} />
              <Route path="*" element={
                <AnimatedPage>
                  <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--tx2)' }}>
                    <h2 style={{ fontSize: '3rem', marginBottom: '10px', color: 'var(--tx)' }}>404</h2>
                    <p style={{ marginBottom: '20px' }}>This page doesn't exist in any language.</p>
                    <NavLink to="/" style={{ color: 'var(--acc)', textDecoration: 'underline' }}>Go Home</NavLink>
                  </div>
                </AnimatedPage>
              } />
            </Routes>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <FloatingKeyboard />
      <PWAInstallPrompt />
      <CommandPalette />
      <SyncConflictManager />
      <Toaster position="bottom-right" toastOptions={{
          style: {
            background: 'var(--s4)',
            color: 'var(--tx)',
            border: '1px solid var(--bd)'
          }
      }} />
    </div> 
    
      </>
    )}
    </>


  )
};

export default App;
