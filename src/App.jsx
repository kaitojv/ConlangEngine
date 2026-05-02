//src/App.jsx

//Imports
import React, { useState, useMemo, Suspense, lazy } from 'react';
import Header from './components/Layout/Header/Header.jsx';
import { useConfigStore } from './store/useConfigStore.jsx';
import './index.css';
import NavBar from './components/Layout/NavBar/Navbar.jsx';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useThemeInjector } from './hooks/useThemeInjector.jsx';
import { useFontInjector } from './utils/useFontInjector.jsx';
import { useGlobalHotkeys } from './hooks/useGlobalHotkeys.jsx';
import Footer from './components/Layout/Footer/Footer.jsx';
import FloatingKeyboard from './components/UI/FloatingKeyboard/FloatingKeyboard.jsx';

import { Toaster } from 'react-hot-toast';

// Lazy loading pages for better performance
const Home = lazy(() => import('./components/pages/home/Home.jsx'));
const Dictionary = lazy(() => import('./components/pages/dictionary/DictionaryList.jsx'));
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

// Define your allowlist of safe relative routes based on your actual Route paths
export const ALLOWED_REDIRECTS = [
  '/',
  '/dictionary',
  '/conlangs',
  '/settings',
  '/create',
  '/generator',
  '/rootmap',
  '/analyzer',
  '/reader',
  '/wiki',
  '/study',
  '/profile',
  '/help',
  '/aligner'
];

function App(){

  const location = useLocation();
  const isPublicView = location.pathname.startsWith('/view/');

  const[openMenu, setOpenMenu] = useState(false);
  const customFontBase64 = useConfigStore(state => state.customFontBase64);
  const rawWritingDirection = useConfigStore(state => state.writingDirection) || 'ltr';

  // SEC-2: Validate customFontBase64 to prevent CSS injection via crafted backup files
  const safeFontBase64 = useMemo(() => {
    if (typeof customFontBase64 !== 'string') return null;
    if (!customFontBase64.startsWith('data:')) return null;
    // Only validate the base64 payload — the data URI prefix legitimately contains semicolons
    // e.g. "data:font/truetype;charset=utf-8;base64,<payload>"
    const payloadMatch = customFontBase64.match(/;base64,(.*)$/);
    if (!payloadMatch) return null;
    // Base64 payload may only contain A-Za-z0-9+/= characters
    if (!/^[A-Za-z0-9+/=]+$/.test(payloadMatch[1])) return null;
    return customFontBase64;
  }, [customFontBase64]);

  // SEC-3: Allowlist writingDirection to prevent CSS injection
  const VALID_DIRECTIONS = ['ltr', 'rtl', 'vertical-rl', 'vertical-lr'];
  const writingDirection = VALID_DIRECTIONS.includes(rawWritingDirection) ? rawWritingDirection : 'ltr';
  const projectId = useConfigStore(state => state.projectId);
  const rehydrateBloat = useConfigStore(state => state.rehydrateBloat);
  const isRehydrating = useConfigStore(state => state.isRehydrating);
  const purgeBloatedGlyphs = useConfigStore(state => state.purgeBloatedGlyphs);
  
  React.useEffect(() => {
      if (projectId) rehydrateBloat();
  }, [projectId, rehydrateBloat]);

  React.useEffect(() => {
      if (purgeBloatedGlyphs) purgeBloatedGlyphs();
  }, [purgeBloatedGlyphs]);

  useThemeInjector();
  useFontInjector();
  useGlobalHotkeys();

  return (
    <>

    {/* Automatically updates writing direction for all conlang text */}
    <style>
        {`
            .custom-font-text {
                writing-mode: ${writingDirection.startsWith('vertical') ? writingDirection : 'horizontal-tb'};
                direction: ${writingDirection === 'rtl' ? 'rtl' : 'ltr'};
            }
            input.custom-font-text, 
            textarea.custom-font-text {
                writing-mode: horizontal-tb !important;
            }
        `}
    </style>
      
    

    {/* PUBLIC VIEWER — standalone route with no app shell */}
    {isPublicView ? (
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0b0f19', color: '#94a3b8' }}>Loading...</div>}>
        <Routes>
          <Route path="/view/:projectId" element={<PublicViewer />} />
        </Routes>
      </Suspense>
    ) : (
      <>
      {isRehydrating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(11, 15, 25, 0.9)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'var(--tx)'
        }}>
          <div className="btn-loading" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--acc)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h2 style={{ marginTop: '20px', fontWeight: '800' }}>Rehydrating Project...</h2>
          <p style={{ color: 'var(--tx2)', fontSize: '0.9rem' }}>Loading large font and glyph data from your database.</p>
        </div>
      )}

    <div className="App">
      <Header openMenu={() => setOpenMenu(true)} />
      <NavBar isMenuOpen={openMenu} closeMenu={() => setOpenMenu(false)} />

      <main className="content">
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '50px', color: 'var(--tx2)' }}>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/help" element={<HelpTab />} />
            
            <Route path="/dictionary" element={<Dictionary />} />
            <Route path="/conlangs" element={<ConlangsTab />} />
            <Route path="/create" element={<CreateWordTab />} />
            <Route path="/generator" element={<GeneratorTab />} />
            <Route path="/rootmap" element={<EtymologyTab />} />
            <Route path="/analyzer" element={<AnalyzerTab />} />
            <Route path="/reader" element={<GlosserTab />} />
            <Route path="/wiki" element={<WikiTab />} />
            <Route path="/study" element={<StudyTab />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<ProfileTab />} />
            <Route path="/aligner" element={<AlignerTab />} />
            <Route path="*" element={
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--tx2)' }}>
                <h2 style={{ fontSize: '3rem', marginBottom: '10px', color: 'var(--tx)' }}>404</h2>
                <p style={{ marginBottom: '20px' }}>This page doesn't exist in any language.</p>
                <NavLink to="/" style={{ color: 'var(--acc)', textDecoration: 'underline' }}>Go Home</NavLink>
              </div>
            } />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <FloatingKeyboard />
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
