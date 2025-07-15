import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Home() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If authentication state is loaded, redirect based on auth status
    if (!loading) {
      if (isAuthenticated) {
        navigate('/projects');
      } else {
        navigate('/admin');
      }
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading while authentication state is being determined
  return (
    <div className="home-container">
      <h1>SEO Project</h1>
      <p>Redirecting...</p>
    </div>
  );
}

export default Home; 