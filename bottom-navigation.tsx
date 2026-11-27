import { useLocation } from 'wouter';

const navigationItems = [
  { id: 'home', icon: '🏠', label: 'الرئيسية', path: '/board' },
  { id: 'feelings', icon: '❤️', label: 'مشاعري', path: '/feelings' },
  { id: 'settings', icon: '⚙️', label: 'الإعدادات', path: '/settings' },
];

export default function BottomNavigation({ onBeforeNavigate }: { onBeforeNavigate?: () => boolean } = {}) {
  const [location, setLocation] = useLocation();

  return (
    <nav className="board-navigation" aria-label="التنقل الرئيسي">
      {navigationItems.map((item) => {
        const isActive = item.path === location || (item.id === 'settings' && location === '/touch');
        return (
          <button
            className={`board-navigation__item${isActive ? ' board-navigation__item--active' : ''}`}
            key={item.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={item.path ? () => {
              if (item.path === location || (onBeforeNavigate && !onBeforeNavigate())) return;
              setLocation(item.path!);
            } : undefined}
          >
            <span className="board-navigation__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}