import { getTopNavIconPath, topNavItems, type TopNavKey } from '../utils/homeView';

interface TopNavProps {
  activeTopNav: TopNavKey;
}

function TopNav({ activeTopNav }: TopNavProps) {
  return (
    <nav className="top-nav">
      <a className="top-nav-brand" href="/" aria-label="Go to home">
        <img src="/resources/logos/logo_horizontal.png" alt="Trip2Guide" />
      </a>

      <div className="top-nav-menu">
        {topNavItems.map((item) => {
          const isSelected = item.key === activeTopNav;
          return (
            <button
              key={item.key}
              type="button"
              className={isSelected ? 'nav-item nav-item-active' : 'nav-item'}
              aria-label={item.label}
            >
              <img
                className="nav-icon"
                src={getTopNavIconPath(item.icon, isSelected)}
                alt=""
                aria-hidden="true"
              />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default TopNav;
