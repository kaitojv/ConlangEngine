import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

// Page components
import Home from './pages/home/Home.jsx';
import Lexicon from './pages/dictionary/LexiconList.jsx';
import Settings from './pages/settings/Settings.jsx';
import CreateWordTab from './pages/create/CreateWordTab.jsx';
import GeneratorTab from './pages/wordgenerator/GeneratorTab.jsx';
import EtymologyTab from './pages/rootmap/EtymologyTab.jsx';
import AnalyzerTab from './pages/analyzer/AnalyzerTab.jsx';
import GlosserTab from './pages/glosser/GlosserTab.jsx';
import WikiTab from './pages/wiki/WikiTab.jsx';
import StudyTab from './pages/study/StudyTab.jsx';
import ProfileTab from './pages/profile/ProfileTab.jsx';
import ConlangsTab from './pages/conlangstab/ConlangsTab.jsx';
import HelpTab from './pages/help/HelpTab.jsx';
import AlignerTab from './pages/aligner/AlignerTab.jsx';
import OrthographyPage from './pages/orthography/OrthographyPage.jsx';
import SemanticExplorer from './pages/lexicon/SemanticExplorer.jsx';
import ExplorePage from './pages/explore/ExplorePage.jsx';

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  in: { opacity: 1, y: 0, scale: 1 },
  out: { opacity: 0, y: -10, scale: 1.02 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.3
};

const AnimatedPage = ({ children }) => {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            style={{ height: '100%' }}
        >
            {children}
        </motion.div>
    );
};

export default function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />
        <Route path="/explore" element={<AnimatedPage><ExplorePage /></AnimatedPage>} />
        <Route path="/help" element={<AnimatedPage><HelpTab /></AnimatedPage>} />
        <Route path="/lexicon" element={<AnimatedPage><Lexicon /></AnimatedPage>} />
        <Route path="/conlangs" element={<AnimatedPage><ConlangsTab /></AnimatedPage>} />
        <Route path="/create" element={<AnimatedPage><CreateWordTab /></AnimatedPage>} />
        <Route path="/generator" element={<AnimatedPage><GeneratorTab /></AnimatedPage>} />
        <Route path="/rootmap" element={<AnimatedPage><EtymologyTab /></AnimatedPage>} />
        <Route path="/analyzer" element={<AnimatedPage><AnalyzerTab /></AnimatedPage>} />
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
              <a href="/" style={{ color: 'var(--acc)', textDecoration: 'underline' }}>Go Home</a>
            </div>
          </AnimatedPage>
        } />
      </Routes>
    </AnimatePresence>
  );
}
