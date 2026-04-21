//src/App.jsx

//Imports
import React, { useState, Suspense, lazy } from 'react'; // Importação adicionada
import Header from './components/Layout/Header/Header.jsx' //Importing header component;
import { useConfigStore } from './store/useConfigStore.jsx';
import './index.css'; //Importing global styles
import NavBar from './components/Layout/NavBar/Navbar.jsx'; //Importing navbar component
import { Routes, Route } from 'react-router-dom'; //Importing routing components from react-router-dom
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
  '/help'
];

function App(){

  //NavBar workflow

  const[openMenu, setOpenMenu] = useState(false);
  const customFontBase64 = useConfigStore(state => state.customFontBase64);
  const writingDirection = useConfigStore(state => state.writingDirection) || 'ltr';
  const purgeBloatedGlyphs = useConfigStore(state => state.purgeBloatedGlyphs);
  
  React.useEffect(() => {
      if (purgeBloatedGlyphs) purgeBloatedGlyphs();
  }, [purgeBloatedGlyphs]);

  useThemeInjector();
  useFontInjector();
  useGlobalHotkeys();

  return (
    <>
    {customFontBase64 && (
            <style>
                {`
                    @font-face {
                        font-family: 'ConlangFont';
                        src: url('${customFontBase64.replace(/^data:.*?;base64,/, 'data:font/truetype;base64,')}') format('truetype');
                    }
                    .custom-font-text {
                        font-family: 'ConlangFont', sans-serif !important;
                    }
                `}
            </style>
        )}

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


  )
};

export default App;
