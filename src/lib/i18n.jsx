import { createContext, useContext, useEffect, useState } from 'react';

const LS_KEY = 'pipaflow_locale';

const TRANSLATIONS = {
  ro: {
    common: {
      done: 'Gata',
      delete: 'Șterge',
      cancel: 'Anulează',
      close: 'Închide (Esc)',
      logout: 'Logout',
    },
    hero: {
      banner: '▲ Pipaflow · v0.1 · Browser-Only Mode',
      tagline: 'No cloud · No tracking · No bullshit',
      eyebrow: 'Open source · MIT',
      title1: 'THINK',
      title2: 'FLOWS',
      title3: 'FAST.',
      subtitle: 'Editor de flowuri logice fără frustrare. Drag bule. Conectează-le. Exportă. Totul rămâne în browser-ul tău.',
      openEditor: 'Deschide editorul',
      featNoFrictionTitle: '0-friction',
      featNoFrictionBody: 'Fără cont. Fără setup. Apeși un buton, desenezi un flow.',
      featBrowserTitle: 'Browser-bound',
      featBrowserBody: 'Datele stau în localStorage. Cloud sync e opt-in, nu default.',
      featOSSTitle: 'Open source',
      featOSSBody: 'Cod MIT pe GitHub. Fork it, ruin it, improve it.',
      footerLeft: '// React 19 · @xyflow · @dagrejs · Tailwind v4',
      footerRight: 'Built fast for thinking fast',
    },
    toolbar: {
      home: 'Acasă',
      flowName: 'Numele flowului',
      linkedFile: 'Fișier legat — Salvează scrie aici',
      detach: 'Detașează',
      newFlow: 'Nou',
      newFlowTitle: 'Flow nou',
      save: 'Salvează',
      saveLocalTitle: 'Salvează în localStorage',
      saveLinkedTitle: 'Salvează în fișier + localStorage',
      undo: 'Undo (Ctrl+Z)',
      redo: 'Redo (Ctrl+Shift+Z)',
      arrange: 'Aranjează',
      arrangeV: 'Aranjează vertical',
      arrangeH: 'Orizontal',
      arrangeHTitle: 'Aranjează orizontal',
      open: 'Deschide',
      openTitle: 'Deschide JSON din disk',
      saveAs: 'Save as',
      saveAsTitle: 'Salvează ca fișier nou pe disk',
      exportJson: 'Export JSON',
      exportPng: 'Export PNG',
      exportSvg: 'Export SVG',
      forAi: 'Pentru AI',
      copied: 'Copiat!',
      forAiTitle: 'Copiază în clipboard un prompt cu schema completă + flowul curent — paste în Claude/GPT/Gemini și AI-ul va genera flowuri compatibile',
      github: 'GitHub',
      githubTitle: 'Conectează GitHub pentru versionare',
      deleteSelection: 'Șterge selecția (Delete)',
    },
    palette: {
      addArrow: 'Adaugă →',
      start: 'Start',
      action: 'Acțiune',
      decision: 'Decizie?',
      end: 'Final',
      note: 'Notă',
      saved: 'Salvate ↘',
    },
    modals: {
      edgeLabelHeader: '⌁ Etichetă săgeată',
      edgeLabelHint: 'Tipic: „yes" / „no" / „dacă fail" / „retry" — gol = șterge eticheta',
      edgeLabelPlaceholder: 'ex: YES',
      edgeLabelDelete: 'Șterge eticheta',
      nodeTextHeader: '▲ Editează text',
      noteHeader: '✎ Notă internă',
      noteHint: 'Apare în colțul bulei — hover ca să citești. Gol = șterge nota.',
      notePlaceholder: 'Comentariu, context, referință...',
      noteDelete: 'Șterge nota',
    },
    ctxPane: {
      addHere: 'Adaugă bulă aici',
    },
    ctxNode: {
      header: 'Bulă · Acțiuni',
      editText: 'Editează text',
      duplicate: 'Duplică',
      addNote: 'Adaugă notă',
      editNote: 'Editează notă',
      fillWith: 'Umple cu',
    },
    ctxEdge: {
      headerStyle: 'Săgeată · Stil',
      solid: 'Linie continuă',
      dashed: 'Punctată',
      dotted: 'Puncte mici',
      animated: 'Animată',
      color: 'Culoare',
      addLabel: 'Adaugă etichetă',
      editLabel: 'Editează etichetă',
      arrowSection: 'Săgeată',
      arrowEnd: 'La capăt',
      arrowBoth: 'Ambele capete',
      arrowStart: 'Doar la început',
      arrowNone: 'Fără săgeată',
      reverse: 'Inversează direcția',
    },
    statusBar: {
      shortcuts: 'drag = select · {space}+drag = pan · right-click = meniu · ctrl+c/v = copy/paste · ctrl+d = duplică · ctrl+z = undo · {dblclick} · shift+2× click = șterge edge',
      space: 'space',
      dblclick: '2× click pe edge = etichetă',
      stats: '{nodes} noduri · {edges} edges',
    },
    confirms: {
      deleteFlow: 'Șterg flowul „{name}"?',
      jsonInvalid: 'JSON invalid: {err}',
      cantOpen: 'Nu am putut deschide fișierul: {err}',
      cantSave: 'Nu am putut salva: {err}',
      cantWrite: 'Nu am putut scrie în fișier: {err}',
    },
    nodes: {
      decisionDefault: 'Decizie?',
      noteDefault: 'Notă',
    },
    github: {
      header: 'GitHub · Versionare',
      step1: '1. Generează un Personal Access Token',
      ghLink: 'GitHub → Tokens (Classic)',
      step1Hint: 'Bifează **repo** pentru repo-uri private, sau **public_repo** pentru doar publice. Fine-grained PATs merg și mai bine — alege _Contents: Read & Write_.',
      step2: '2. Lipește token-ul',
      tokenPlaceholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      connect: 'Conectează',
      connecting: 'Conectare...',
      checking: 'Verifică token...',
      connected: 'Conectat ca @{login}',
      repoLabel: 'Repository',
      repoPlaceholder: 'username/repo-name',
      pathLabel: 'Cale fișier în repo',
      pathPlaceholder: 'flows/flow.json',
      commitLabel: 'Mesaj commit',
      commitPlaceholder: 'Update {name}',
      saveVersion: 'Salvează versiune',
      saving: 'Se salvează...',
      saved: 'Salvat pe GitHub ✓',
      historyTitle: 'Istoric versiuni',
      historyEmpty: 'Niciun commit găsit pe această cale.',
      historyLoading: 'Încarcă istoricul...',
      load: 'Load',
      loadingVersion: 'Încarcă versiunea...',
      versionLoaded: 'Versiune încărcată ✓',
    },
  },
  en: {
    common: {
      done: 'Done',
      delete: 'Delete',
      cancel: 'Cancel',
      close: 'Close (Esc)',
      logout: 'Logout',
    },
    hero: {
      banner: '▲ Pipaflow · v0.1 · Browser-Only Mode',
      tagline: 'No cloud · No tracking · No bullshit',
      eyebrow: 'Open source · MIT',
      title1: 'THINK',
      title2: 'FLOWS',
      title3: 'FAST.',
      subtitle: 'Logic flow editor without the friction. Drag boxes. Connect them. Export. Everything stays in your browser.',
      openEditor: 'Open editor',
      featNoFrictionTitle: '0-friction',
      featNoFrictionBody: 'No account. No setup. Click a button, draw a flow.',
      featBrowserTitle: 'Browser-bound',
      featBrowserBody: 'Data lives in localStorage. Cloud sync is opt-in, never default.',
      featOSSTitle: 'Open source',
      featOSSBody: 'MIT code on GitHub. Fork it, ruin it, improve it.',
      footerLeft: '// React 19 · @xyflow · @dagrejs · Tailwind v4',
      footerRight: 'Built fast for thinking fast',
    },
    toolbar: {
      home: 'Home',
      flowName: 'Flow name',
      linkedFile: 'Linked file — Save writes here',
      detach: 'Detach',
      newFlow: 'New',
      newFlowTitle: 'New flow',
      save: 'Save',
      saveLocalTitle: 'Save to localStorage',
      saveLinkedTitle: 'Save to file + localStorage',
      undo: 'Undo (Ctrl+Z)',
      redo: 'Redo (Ctrl+Shift+Z)',
      arrange: 'Arrange',
      arrangeV: 'Arrange vertically',
      arrangeH: 'Horizontal',
      arrangeHTitle: 'Arrange horizontally',
      open: 'Open',
      openTitle: 'Open JSON from disk',
      saveAs: 'Save as',
      saveAsTitle: 'Save as new file on disk',
      exportJson: 'Export JSON',
      exportPng: 'Export PNG',
      exportSvg: 'Export SVG',
      forAi: 'For AI',
      copied: 'Copied!',
      forAiTitle: 'Copy a prompt with full schema + current flow to clipboard — paste in Claude/GPT/Gemini and the AI generates compatible flows',
      github: 'GitHub',
      githubTitle: 'Connect GitHub for versioning',
      deleteSelection: 'Delete selection (Delete)',
    },
    palette: {
      addArrow: 'Add →',
      start: 'Start',
      action: 'Action',
      decision: 'Decision?',
      end: 'End',
      note: 'Note',
      saved: 'Saved ↘',
    },
    modals: {
      edgeLabelHeader: '⌁ Edge label',
      edgeLabelHint: 'Typical: "yes" / "no" / "if fail" / "retry" — empty = remove label',
      edgeLabelPlaceholder: 'e.g. YES',
      edgeLabelDelete: 'Remove label',
      nodeTextHeader: '▲ Edit text',
      noteHeader: '✎ Internal note',
      noteHint: 'Shows in the corner of the box — hover to read. Empty = remove note.',
      notePlaceholder: 'Comment, context, reference...',
      noteDelete: 'Remove note',
    },
    ctxPane: {
      addHere: 'Add box here',
    },
    ctxNode: {
      header: 'Box · Actions',
      editText: 'Edit text',
      duplicate: 'Duplicate',
      addNote: 'Add note',
      editNote: 'Edit note',
      fillWith: 'Fill with',
    },
    ctxEdge: {
      headerStyle: 'Edge · Style',
      solid: 'Solid line',
      dashed: 'Dashed',
      dotted: 'Dotted',
      animated: 'Animated',
      color: 'Color',
      addLabel: 'Add label',
      editLabel: 'Edit label',
      arrowSection: 'Arrowhead',
      arrowEnd: 'At end',
      arrowBoth: 'Both ends',
      arrowStart: 'At start only',
      arrowNone: 'No arrow',
      reverse: 'Reverse direction',
    },
    statusBar: {
      shortcuts: 'drag = select · {space}+drag = pan · right-click = menu · ctrl+c/v = copy/paste · ctrl+d = duplicate · ctrl+z = undo · {dblclick} · shift+2× click = delete edge',
      space: 'space',
      dblclick: '2× click on edge = label',
      stats: '{nodes} nodes · {edges} edges',
    },
    confirms: {
      deleteFlow: 'Delete flow "{name}"?',
      jsonInvalid: 'Invalid JSON: {err}',
      cantOpen: 'Could not open file: {err}',
      cantSave: 'Could not save: {err}',
      cantWrite: 'Could not write to file: {err}',
    },
    nodes: {
      decisionDefault: 'Decision?',
      noteDefault: 'Note',
    },
    github: {
      header: 'GitHub · Versioning',
      step1: '1. Generate a Personal Access Token',
      ghLink: 'GitHub → Tokens (Classic)',
      step1Hint: 'Tick **repo** for private repos, or **public_repo** for public only. Fine-grained PATs work even better — pick _Contents: Read & Write_.',
      step2: '2. Paste your token',
      tokenPlaceholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      connect: 'Connect',
      connecting: 'Connecting...',
      checking: 'Verifying token...',
      connected: 'Connected as @{login}',
      repoLabel: 'Repository',
      repoPlaceholder: 'username/repo-name',
      pathLabel: 'File path in repo',
      pathPlaceholder: 'flows/flow.json',
      commitLabel: 'Commit message',
      commitPlaceholder: 'Update {name}',
      saveVersion: 'Save version',
      saving: 'Saving...',
      saved: 'Saved on GitHub ✓',
      historyTitle: 'Version history',
      historyEmpty: 'No commits found at this path.',
      historyLoading: 'Loading history...',
      load: 'Load',
      loadingVersion: 'Loading version...',
      versionLoaded: 'Version loaded ✓',
    },
  },
};

const I18nContext = createContext({
  locale: 'ro',
  setLocale: () => {},
  t: (k) => k,
});

function resolve(obj, path) {
  return path.split('.').reduce((v, p) => (v == null ? v : v[p]), obj);
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    if (typeof window === 'undefined') return 'ro';
    return localStorage.getItem(LS_KEY) || (navigator.language?.startsWith('en') ? 'en' : 'ro');
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key, vars) => {
    let str = resolve(TRANSLATIONS[locale], key);
    if (str == null) str = resolve(TRANSLATIONS.ro, key);
    if (str == null) return key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v));
      }
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale: setLocaleState, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
