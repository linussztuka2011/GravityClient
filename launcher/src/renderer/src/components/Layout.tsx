import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app-container">
      <main className="main-view">
        <div className="titlebar-spacer" />
        <div className="content-pane custom-scroller">
          {children}
        </div>
      </main>
    </div>
  );
};
export default Layout;
