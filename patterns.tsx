import type { AdminRecurringUsePattern } from '@workspace/api-client-react';
import { communicationCards } from '@/lib/communication-cards';
import { formatCount, formatExactTime, formatHourRange } from './format';

export function OwnerActivityPatterns({ patterns }: { patterns: AdminRecurringUsePattern[] }) {
  return (
    <section className="oa-patterns" aria-label="أنماط متكررة">
      <h3>أنماط متكررة (تنبيه خاص)</h3>
      <p className="feelings-note">
        المعيار: نفس الأيقونة داخل نفس الساعة على ٣ أيام مختلفة أو أكثر خلال آخر ٧ أيام بتوقيت عمّان.
      </p>
      {patterns.length === 0 ? (
        <p className="feelings-note">لا يوجد نمط يطابق هذا المعيار حاليًا.</p>
      ) : (
        <ul>
          {patterns.map((p) => {
            const card = communicationCards.find((c) => c.key === p.cardKey);
            return (
              <li key={`${p.cardKey}-${p.hour}`} data-testid={`pattern-${p.cardKey}-${p.hour}`}>
                <strong>{card ? `${card.icon} ${card.label}` : p.cardKey}</strong>
                <span>
                  الساعة {formatHourRange(p.hour)} · في {formatCount(p.dayCount)} أيام من آخر{' '}
                  {formatCount(p.windowDays)} · {formatCount(p.totalUses)} اختيارًا
                </span>
                <span>آخر مرة: {formatExactTime(p.lastUsedAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
