import { createContext, useContext, useState, type ReactNode } from 'react';

export const assistants = [
  { id: 'duck', label: 'البط الأصفر' },
  { id: 'cat', label: 'قطة وردية' },
  { id: 'squirrel', label: 'سنجاب بني' },
] as const;

export type AssistantId = (typeof assistants)[number]['id'];
const storageKey = 'unsaid-assistant';

type AssistantSettings = {
  assistant: AssistantId;
  setAssistant: (assistant: AssistantId) => void;
  storageWarning: string | null;
};

export function isAssistantId(value: unknown): value is AssistantId {
  return value === 'duck' || value === 'cat' || value === 'squirrel';
}

function readAssistant(): { assistant: AssistantId; storageWarning: string | null } {
  try {
    const stored = localStorage.getItem(storageKey);
    return { assistant: isAssistantId(stored) ? stored : 'duck', storageWarning: null };
  } catch {
    return {
      assistant: 'duck',
      storageWarning: 'تعذّر الوصول إلى التخزين. سيعمل تغيير المساعد في هذه الجلسة فقط.',
    };
  }
}

const AssistantSettingsContext = createContext<AssistantSettings | null>(null);

export function AssistantSettingsProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(readAssistant);

  const setAssistant = (assistant: AssistantId) => {
    if (!isAssistantId(assistant)) return;
    let storageWarning: string | null = null;
    try {
      localStorage.setItem(storageKey, assistant);
    } catch {
      storageWarning = 'تعذّر حفظ المساعد على الجهاز. سيعمل التغيير في هذه الجلسة فقط.';
    }
    setPreference({ assistant, storageWarning });
  };

  return (
    <AssistantSettingsContext.Provider value={{ ...preference, setAssistant }}>
      {children}
    </AssistantSettingsContext.Provider>
  );
}

export function useAssistantSettings() {
  const context = useContext(AssistantSettingsContext);
  if (!context) throw new Error('Assistant settings require AssistantSettingsProvider.');
  return context;
}
