//src/App.jsx

//Imports
import { useState } from 'react'; // Importação adicionada
import Header from './components/Layout/Header/Header.jsx' //Importing header component;
import { useConfigStore } from './store/useConfigStore.jsx';
import './index.css'; //Importing global styles
import NavBar from './components/Layout/NavBar/Navbar.jsx'; //Importing navbar component
import Home from './components/pages/home/Home.jsx'; //Importing home page component
import Dictionary from './components/pages/dictionary/DictionaryList.jsx'; //Importing dictionary page component
import Settings from './components/pages/settings/Settings.jsx'; //Importing settings page component
import CreateWordTab from './components/pages/create/CreateWordTab.jsx';
import { Routes, Route } from 'react-router-dom'; //Importing routing components from react-router-dom
import { useThemeInjector } from './hooks/useThemeInjector.jsx';
import { useFontInjector } from './utils/useFontInjector.jsx';
import GeneratorTab from './components/pages/wordgenerator/GeneratorTab.jsx'
import EtymologyTab from './components/pages/rootmap/EtymologyTab.jsx';
import AnalyzerTab from './components/pages/analyzer/AnalyzerTab.jsx';
import GlosserTab from './components/pages/glosser/GlosserTab.jsx';
import WikiTab from './components/pages/wiki/WikiTab.jsx';
import FlashcardsTab from './components/pages/flashcards/FlashcardsTab.jsx';
import ProfileTab from './components/pages/profile/ProfileTab.jsx';
import ConlangsTab from './components/pages/conlangstab/ConlangsTab.jsx';

function App(){

  //NavBar workflow

  const[openMenu, setOpenMenu] = useState(false);
  const customFontBase64 = useConfigStore(state => state.customFontBase64);
  const writingDirection = useConfigStore(state => state.writingDirection) || 'ltr';
  
  useThemeInjector();
  useFontInjector();


  return (
    <>
    {customFontBase64 && (
            <style>
                {`
                    @font-face {
                        font-family: 'ConlangFont';
                        src: url('${customFontBase64}') format('truetype');
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/conlangs" element={<ConlangsTab />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/create" element={<CreateWordTab />} />
          <Route path="/generator" element={<GeneratorTab />} />
          <Route path="/rootmap" element={<EtymologyTab />} />
          <Route path="/analyzer" element={<AnalyzerTab />} />
          <Route path="/reader" element={<GlosserTab />} />
          <Route path="/wiki" element={<WikiTab />} />
          <Route path="/flashcards" element={<FlashcardsTab />} />
          <Route path="/profile" element={<ProfileTab />} />
        </Routes>
      </main>
    </div> 
    </>


  )
};

export default App;