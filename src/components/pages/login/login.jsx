import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ALLOWED_REDIRECTS } from '../../../App.jsx'; // Import the allowlist we just made

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSuccess = async () => {
    // 1. Execute your Supabase login logic here
    // const { error } = await supabase.auth.signInWithPassword(...)
    
    // 2. Extract the requested redirect URL from the browser's search parameters
    const searchParams = new URLSearchParams(location.search);
    const requestedRedirect = searchParams.get('redirectTo');

    // 3. Validate against your centralized App.jsx allowlist
    const safeRedirectUrl = ALLOWED_REDIRECTS.includes(requestedRedirect) 
      ? requestedRedirect 
      : '/'; // Fallback to home page if invalid, missing, or malicious

    // 4. Safely redirect the user
    navigate(safeRedirectUrl, { replace: true });
  };

  return (
    <div className="login-container">
       {/* Your email/password inputs */}
       <button onClick={handleLoginSuccess}>Log In</button>
    </div>
  );
}
