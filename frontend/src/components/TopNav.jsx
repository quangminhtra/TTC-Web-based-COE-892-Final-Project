import { NavLink } from 'react-router-dom';

export default function TopNav() {
  return (
    <nav className="top-nav" aria-label="Primary">
      <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/">
        Dashboard
      </NavLink>
      <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/lines/1">
        Subway Lines
      </NavLink>
    </nav>
  );
}
