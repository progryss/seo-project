import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-content">
          <p>&copy; {currentYear} SEO Project. All rights reserved.</p>
          <p>
            <a href="https://progryss.com/" target="_blank" rel="noopener noreferrer">
              Progryss Media
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer; 