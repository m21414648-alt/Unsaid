export const communicationCards = [
  { key: 'hungry', icon: '🍽️', label: 'جوعان', phrase: 'أنا جوعان', color: '#F8E8DC', textColor: '#7C2D12' },
  { key: 'thirsty', icon: '💧', label: 'عطشان', phrase: 'أنا عطشان', color: '#D8EAF5', textColor: '#1E3A8A' },
  { key: 'toilet', icon: '🚻', label: 'الحمام', phrase: 'أريد الذهاب إلى الحمام', color: '#E7E0F2', textColor: '#4C1D95' },
  { key: 'sleepy', icon: '😴', label: 'نعسان', phrase: 'أنا نعسان', color: '#D9E0EA', textColor: '#1E293B' },
  { key: 'cold', icon: '❄️', label: 'بردان', phrase: 'أنا بردان', color: '#E0EDE0', textColor: '#14532D' },
  { key: 'happy', icon: '😊', label: 'فرحان', phrase: 'أنا فرحان', color: '#F5EBD1', textColor: '#713F12' },
  { key: 'sad', icon: '😢', label: 'حزين', phrase: 'أنا حزين', color: '#DCE8F2', textColor: '#1E3A8A' },
  { key: 'pain', icon: '🩹', label: 'بتوجعني', phrase: 'أنا أتألم', color: '#F1DFE2', textColor: '#831843' },
  { key: 'help', icon: '🆘', label: 'أحتاج مساعدة', phrase: 'أحتاج مساعدة', color: '#F0D9D9', textColor: '#7F1D1D' },
  { key: 'afraid', icon: '😨', label: 'خايف', phrase: 'أنا خايف', color: '#E5E7EB', textColor: '#374151' },
] as const;

export type RecordingTarget = { key: string; label: string; phrase: string };

export function getRecordingTargets(drawings: { id: string }[]): RecordingTarget[] {
  return [
    ...communicationCards.map(({ key, label, phrase }) => ({ key, label, phrase })),
    ...drawings.map((drawing, index) => ({
      key: `drawing:${drawing.id}`,
      label: `لمستي ${index + 1}`,
      phrase: 'هذه رسمتي',
    })),
  ];
}