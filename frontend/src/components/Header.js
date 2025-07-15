import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Header() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo">
          <Link to={isAuthenticated ? '/projects' : '/'}>
            <h1>SEO Project</h1>
          </Link>
        </div>
        
        <nav className="main-nav">
          {isAuthenticated ? (
            <>
              <Link to="/projects" className="nav-link">Projects</Link>
              <Link to="/add-project" className="nav-link">Add Project</Link>
              <button onClick={handleLogout} className="logout-nav-button">
                Logout
              </button>
            </>
          ) : (
            <Link to="/admin" className="nav-link">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header; 