'use client';

import UserArea from './UserArea';

export default function Header({ 
  user,
  isDarkTheme,
  toggleTheme,
  handleSignOut,
  handleAuth,
  handleSubscribe
}) {
  return (
    <header className="header-right">
      <UserArea 
        user={user}
        isDarkTheme={isDarkTheme}
        toggleTheme={toggleTheme}
        handleSignOut={handleSignOut}
        handleAuth={handleAuth}
        handleSubscribe={handleSubscribe}
      />
    </header>
  );
} 