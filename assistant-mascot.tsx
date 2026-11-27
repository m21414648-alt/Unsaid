import type { AssistantId } from '@/context/assistant-settings';

type Props = { assistant: AssistantId; className?: string; testId?: string };

function Shadow() {
  return <ellipse cx="86" cy="132" rx="48" ry="7" fill="#CBD5E1" fillOpacity="0.48" />;
}

function Duck() {
  return (
    <>
      <Shadow />
      <path d="M121 83C132 76 141 77 148 83C141 93 132 98 120 98" fill="#FDE68A" stroke="#EAB308" strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 97C31 89 30 78 34 67C39 51 54 42 72 39C79 24 95 18 111 24C126 30 133 44 131 60C143 66 149 78 146 90C142 108 126 119 106 120H64C51 119 41 111 36 97Z" fill="#FACC15" stroke="#EAB308" strokeWidth="3" strokeLinejoin="round" />
      <path d="M51 83C59 71 76 70 89 81C81 94 66 100 52 96C47 92 47 87 51 83Z" fill="#FDE68A" stroke="#EAB308" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M61 65C46 61 29 64 18 73C30 88 49 91 65 77C71 73 69 68 61 65Z" fill="#FB923C" stroke="#EA7B18" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M28 74C37 83 51 83 60 73" stroke="#9A4714" strokeWidth="2.8" strokeLinecap="round" />
      <ellipse cx="69" cy="57" rx="7.5" ry="9" fill="#FFFFFF" />
      <ellipse cx="87" cy="57" rx="7.5" ry="9" fill="#FFFFFF" />
      <circle cx="67" cy="59" r="4.4" fill="#2563EB" />
      <circle cx="85" cy="59" r="4.4" fill="#2563EB" />
      <circle cx="67" cy="59" r="2" fill="#1E3A8A" />
      <circle cx="85" cy="59" r="2" fill="#1E3A8A" />
      <circle cx="65.5" cy="57.5" r="1.2" fill="#FFFFFF" />
      <circle cx="83.5" cy="57.5" r="1.2" fill="#FFFFFF" />
      <path d="M80 23C76 15 81 10 87 8M94 22C94 14 101 12 106 13" stroke="#EAB308" strokeWidth="3" strokeLinecap="round" />
      <path d="M70 119L68 126M101 119L104 126" stroke="#EA7B18" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M59 127C63 124 70 124 74 127M99 127C103 124 110 124 114 127" stroke="#EA7B18" strokeWidth="3.5" strokeLinecap="round" />
    </>
  );
}

function Cat() {
  return (
    <>
      <Shadow />
      <path d="M128 100C150 98 152 70 140 64" stroke="#EC4899" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M42 100C38 78 52 62 86 62C120 62 134 78 130 100C128 116 112 121 86 121C60 121 44 116 42 100Z" fill="#F9A8D4" stroke="#EC4899" strokeWidth="3" strokeLinejoin="round" />
      <path d="M52 52L48 16L78 36ZM120 52L124 16L94 36Z" fill="#F9A8D4" stroke="#EC4899" strokeWidth="3" strokeLinejoin="round" />
      <path d="M55 42L54 26L68 36ZM117 42L118 26L104 36Z" fill="#FBCFE8" />
      <ellipse cx="86" cy="56" rx="40" ry="33" fill="#F9A8D4" stroke="#EC4899" strokeWidth="3" />
      <ellipse cx="86" cy="104" rx="20" ry="14" fill="#FDE8F3" />
      <ellipse cx="69" cy="53" rx="6.5" ry="8.5" fill="#FFFFFF" />
      <ellipse cx="103" cy="53" rx="6.5" ry="8.5" fill="#FFFFFF" />
      <circle cx="69" cy="55" r="4.2" fill="#9D174D" />
      <circle cx="103" cy="55" r="4.2" fill="#9D174D" />
      <circle cx="67.5" cy="53" r="1.3" fill="#FFFFFF" />
      <circle cx="101.5" cy="53" r="1.3" fill="#FFFFFF" />
      <path d="M82 66L90 66L86 71Z" fill="#DB2777" />
      <path d="M86 71C86 77 79 78 76 75M86 71C86 77 93 78 96 75" stroke="#9D174D" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M52 64L36 61M52 70L36 74M120 64L136 61M120 70L136 74" stroke="#BE185D" strokeWidth="2" strokeLinecap="round" />
      <circle cx="55" cy="68" r="5" fill="#F472B6" fillOpacity="0.5" />
      <circle cx="117" cy="68" r="5" fill="#F472B6" fillOpacity="0.5" />
      <ellipse cx="68" cy="124" rx="11" ry="6" fill="#FBCFE8" stroke="#EC4899" strokeWidth="2.5" />
      <ellipse cx="104" cy="124" rx="11" ry="6" fill="#FBCFE8" stroke="#EC4899" strokeWidth="2.5" />
    </>
  );
}

function Squirrel() {
  return (
    <>
      <Shadow />
      <path d="M122 112C160 118 168 70 142 46C128 30 112 44 124 62C134 76 112 82 116 96" fill="#B7793F" stroke="#7C4A21" strokeWidth="3" strokeLinejoin="round" />
      <path d="M140 52C152 66 150 92 128 106" stroke="#D9A05F" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M44 100C42 80 56 66 82 66C108 66 122 80 120 100C118 116 104 121 82 121C60 121 46 116 44 100Z" fill="#A8672F" stroke="#7C4A21" strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="82" cy="102" rx="19" ry="14" fill="#F3D9B1" />
      <path d="M52 50L50 22L72 36ZM108 50L110 22L88 36Z" fill="#A8672F" stroke="#7C4A21" strokeWidth="3" strokeLinejoin="round" />
      <path d="M56 42L56 31L66 37ZM104 42L104 31L94 37Z" fill="#D9A05F" />
      <ellipse cx="80" cy="56" rx="37" ry="31" fill="#A8672F" stroke="#7C4A21" strokeWidth="3" />
      <ellipse cx="80" cy="66" rx="22" ry="16" fill="#F3D9B1" />
      <ellipse cx="66" cy="52" rx="6.5" ry="8.5" fill="#FFFFFF" />
      <ellipse cx="94" cy="52" rx="6.5" ry="8.5" fill="#FFFFFF" />
      <circle cx="66" cy="54" r="4.2" fill="#3B1D0A" />
      <circle cx="94" cy="54" r="4.2" fill="#3B1D0A" />
      <circle cx="64.5" cy="52" r="1.3" fill="#FFFFFF" />
      <circle cx="92.5" cy="52" r="1.3" fill="#FFFFFF" />
      <ellipse cx="80" cy="63" rx="4.5" ry="3.2" fill="#3B1D0A" />
      <path d="M80 66C80 73 73 74 70 71M80 66C80 73 87 74 90 71" stroke="#3B1D0A" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <rect x="76" y="70" width="8" height="8" rx="2" fill="#FFFFFF" stroke="#7C4A21" strokeWidth="1.5" />
      <ellipse cx="64" cy="124" rx="11" ry="6" fill="#8A5224" stroke="#7C4A21" strokeWidth="2.5" />
      <ellipse cx="100" cy="124" rx="11" ry="6" fill="#8A5224" stroke="#7C4A21" strokeWidth="2.5" />
    </>
  );
}

export default function AssistantMascot({ assistant, className, testId }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 145"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-assistant={assistant}
      data-testid={testId}
    >
      {assistant === 'cat' ? <Cat /> : assistant === 'squirrel' ? <Squirrel /> : <Duck />}
    </svg>
  );
}
