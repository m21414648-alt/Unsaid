import { useEffect } from 'react';
import AssistantMascot from '@/components/assistant-mascot';
import BottomNavigation from '@/components/bottom-navigation';
import { DrawingPreview } from '@/components/drawing-pad';
import useSavedDrawings from '@/hooks/use-saved-drawings';
import { communicationCards } from '@/lib/communication-cards';
import { useAssistantSettings } from '@/context/assistant-settings';
import { useVoiceSettings } from '@/context/voice-settings';
import useFeelingActivity from '@/hooks/use-feeling-activity';

export default function MainBoard() {
  const { savedDrawings, storageError } = useSavedDrawings();
  const { assistant } = useAssistantSettings();
  const { playCard, error: voiceError } = useVoiceSettings();
  const { trackCard, error: activityError } = useFeelingActivity();
  useEffect(() => {
    document.title = 'Unsaid — كيف تشعر اليوم؟';
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  return (
    <main className="board-screen" dir="rtl">
      <div className="board-shell">
        <header className="board-header">
          <p>اختر ما تريد قوله</p>
          <div className="duck-assistant">
            <AssistantMascot
              assistant={assistant}
              className="duck-assistant__mascot"
              testId="board-assistant"
            />
            <div className="duck-assistant__bubble">
              <svg
                className="duck-assistant__cloud"
                viewBox="0 0 240 104"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M42 14C23 14 10 28 10 48C10 67 25 80 45 80H107L122 100L134 80H196C218 80 230 67 230 49C230 32 219 21 203 19C199 5 181 1 169 13C157 1 138 1 128 14C115 3 96 6 88 18C76 7 55 7 48 20C46 16 44 14 42 14Z"
                  fill="#FFFFFF"
                  stroke="#BFDBFE"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              <h1 className="duck-assistant__question">كيف تشعر اليوم؟</h1>
            </div>
          </div>
        </header>

        {voiceError && <p className="board-drawing-warning" role="alert">{voiceError}</p>}
        {activityError && <p className="board-drawing-warning" role="alert">{activityError}</p>}
        <section className="communication-grid" aria-label="عبارات التواصل">
          {communicationCards.map((card) => (
            <button
              className="communication-card"
              key={card.key}
              type="button"
              style={{ backgroundColor: card.color, color: card.textColor }}
              aria-label={`${card.label}: ${card.phrase}`}
              data-testid={`card-sound-${card.key}`}
              onClick={() => {
                trackCard(card.key);
                void playCard(card.key, card.key);
              }}
            >
              <span className="communication-card__icon" aria-hidden="true">
                {card.icon}
              </span>
              <span className="communication-card__label">{card.label}</span>
            </button>
          ))}
          {savedDrawings.map((drawing, index) => drawing.showOnBoard ? (
            <button
              className="communication-card communication-card--drawing"
              key={drawing.id}
              type="button"
              aria-label={`لمستي ${index + 1}: هذه رسمتي`}
              data-testid={`board-drawing-${drawing.id}`}
              onClick={() => { void playCard(`drawing:${drawing.id}`, 'drawing'); }}
            >
              <DrawingPreview strokes={drawing.strokes} className="communication-card__drawing" />
              <span className="communication-card__label">لمستي {index + 1}</span>
            </button>
          ) : null)}
        </section>
        {storageError && <p className="board-drawing-warning" role="alert">{storageError}</p>}
      </div>

      <BottomNavigation />
    </main>
  );
}