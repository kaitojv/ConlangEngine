# Conlang Engine

Conlang Engine is a local-first, professional-grade integrated development environment (IDE) designed for linguists, authors, and constructed language (conlang) creators. Unlike static spreadsheet-based dictionaries, this application utilizes a real-time morphological derivation engine, allowing creators to store pure linguistic roots while the system dynamically handles paradigms, allomorphy, and syntax validation.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/V7V11X13JL)
[Patreon(https://github.com/elsiehupp/patron-button/raw/master/svg/become_a_patron_8x5_coral_text_on_white.svg)]([https://www.buymeacoffee.com/](https://patreon.com/KaitoCE))


## Core Features

### 1. Dynamic Lexicography & Universal Paradigm Matrix
* **Pure Root System:** Store only the base morpheme in the database. The engine applies grammatical rules on the fly to generate complete conjugation and declension tables.
* **Universal Matrix:** A cross-referencing matrix that automatically aligns custom grammatical persons/classes (e.g., 1S, 2P, Inanimate, Nominative) with specific tense, aspect, or case rules.
* **Irregularity Handling:** Native support for JSON-formatted exceptions, allowing specific rule intersections to be manually overridden without breaking the automated engine.

### 2. Smart Affix Engine (Allomorphy & Infixes)
* **Regex-Conditioned Rules:** Define affixes that adapt based on the phonological environment of the root (e.g., applying a different suffix if the word ends in a vowel vs. a consonant).
* **Positional Infixes:** Advanced support for infixation. The engine can inject morphemes at specific indices, after the first consonant (`@C`), after the first vowel (`@V`), or at manually designated infix boundaries within the root (`*`).

### 3. Ambiguity-Aware Syntax Analyzer
* **Sentence Parsing:** Input full sentences to be automatically decomposed into roots and morphemes based on the language's active rule set.
* **Syntax Validation:** Evaluates the parsed sentence against the globally defined Word Order (e.g., SVO, SOV) and flags structural anomalies.
* **Manual Resolution:** Provides dropdown interfaces to manually resolve morphological ambiguities when a word matches multiple valid parsing routes.

### 4. Interactive Reader
* **Dynamic Text Processing:** Paste large blocks of text in the constructed language. The engine parses the text and wraps recognized words in interactive components.
* **Morphological Tooltips:** Hovering over recognized words reveals a detailed tooltip containing the original root, its IPA transcription, grammatical class, translation, and the specific inflections applied.

### 5. Phonotactic Generator
* **Algorithmic Word Generation:** Create random phonologically valid words based on user-defined syllable structures (e.g., CV, CVC) and available consonant/vowel inventories.
* **Direct Lexical Integration:** Send generated words directly to the dictionary creation form with pre-assigned grammatical classes.

### 6. Grammar Wiki
* **Integrated Documentation:** A built-in, paginated rich-text editor to document phonology, morphology, syntax, and cultural notes.
* **Local Persistence:** Wiki pages are saved seamlessly to the local database alongside the lexicon.

### 7. Robust Data Management
* **Local-First Architecture:** All data is stored within the browser's `localStorage`, ensuring complete privacy, zero latency, and offline availability.
* **Safe JSON Export/Import:** Features a fail-safe data serialization system. Users can export their entire language (rules, lexicon, and configurations) as a single `.json` file and import it securely, with the system automatically re-initializing the UI upon successful data merge.

## Architecture & Technologies

The Conlang Engine is built with a minimalist, high-performance tech stack:
* **Frontend:** HTML5, CSS3 (Custom Glassmorphism UI, CSS Variables for dynamic theming).
* **Logic & Processing:** Vanilla JavaScript (ES6+). No external frameworks (React/Vue/Angular) are used, ensuring a lightweight footprint and long-term maintainability.
* **Storage:** Browser Web Storage API (`localStorage`).
* **Text-to-Speech:** Web Speech API integration with deep mapping for custom orthography-to-IPA pronunciation.

## Getting Started

1. Download or clone this repository to your local machine.
2. Ensure the directory contains `index.html`, `style.css`, and `app.js`.
3. Open `index.html` in any modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, or Brave).
4. Navigate to the **Settings** tab to define your language's phonology, syllable structure, and grammatical rules.
5. Begin adding roots in the **Create Word** tab.

**Important Note:** Because this application uses `localStorage`, your data is tied to the specific browser and device you are using. Regularly use the **Export .json** feature to create physical backups of your language.

## License

This project is provided as an open-source tool for the conlanging community.
