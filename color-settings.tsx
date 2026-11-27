import { useColorTheme, colorThemes } from '@/context/color-theme';
import './color-settings.css';

export default function ColorSettings() {
  const { theme, setTheme, storageWarning } = useColorTheme();

  return (
    <section className="settings-card color-settings" aria-labelledby="color-setting-title">
      <div className="settings-card__intro">
        <span className="color-settings__icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M6 36a18 18 0 0 1 36 0" stroke="#F87171" strokeWidth="4" strokeLinecap="round" />
            <path d="M12 36a12 12 0 0 1 24 0" stroke="#FACC15" strokeWidth="4" strokeLinecap="round" />
            <path d="M18 36a6 6 0 0 1 12 0" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </span>
        <div className="settings-card__title">
          <h2 id="color-setting-title">ألواني</h2>
          <p>اختر الألوان التي تريحك.</p>
        </div>
      </div>

      <div className="color-settings__options" role="radiogroup" aria-labelledby="color-setting-title">
        {colorThemes.map((item) => {
          const selected = theme === item.id;
          return (
            <label
              key={item.id}
              className={`color-settings__option${selected ? ' color-settings__option--selected' : ''}`}
              data-testid={`option-color-${item.id}`}
            >
              <input
                className="color-settings__input"
                type="radio"
                name="color-theme"
                value={item.id}
                checked={selected}
                onChange={() => setTheme(item.id)}
              />
              <span className="color-settings__swatches" aria-hidden="true">
                <i style={{ background: '#ffffff' }} />
                <i style={{ background: item.swatch }} />
              </span>
              <span className="color-settings__label">{item.label}</span>
              <span className="color-settings__check" aria-hidden="true">
                {selected && (
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {storageWarning && (
        <p className="settings-warning" role="status" data-testid="status-color-storage-warning">
          {storageWarning}
        </p>
      )}
    </section>
  );
}
