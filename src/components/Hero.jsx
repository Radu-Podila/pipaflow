export default function Hero({ onStart }) {
  return (
    <div className="pf-hero">
      <div className="pf-hero__inner">
        <div className="pf-hero__logo" aria-hidden>
          <span className="pf-bubble pf-bubble--blue" />
          <span className="pf-bubble pf-bubble--green" />
          <span className="pf-bubble pf-bubble--orange" />
        </div>
        <h1 className="pf-hero__title">Pipaflow</h1>
        <p className="pf-hero__tag">Editor de flowuri logice. Drag bule, conectează cu săgeți, salvează local.</p>
        <p className="pf-hero__subtag">Fără cont. Fără cloud. Fără bullshit.</p>

        <div className="pf-hero__cta">
          <button className="pf-btn pf-btn--primary" onClick={onStart}>
            Deschide editorul →
          </button>
        </div>

        <ul className="pf-hero__features">
          <li>✓ Drag & drop, snap-to-grid, mini-map</li>
          <li>✓ Auto-layout (Dagre), undo/redo</li>
          <li>✓ Export JSON / PNG / SVG</li>
          <li>✓ Multiple flowuri salvate în browser</li>
          <li>✓ Open source, MIT</li>
        </ul>

        <p className="pf-hero__footer">
          Built fast for thinking fast. Datele rămân în browser-ul tău.
        </p>
      </div>
    </div>
  );
}
