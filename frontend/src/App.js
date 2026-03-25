import React, { Component } from 'react';
import Dashboard from './components/Dashboard';
import DeviceExplorer from './components/DeviceExplorer';
import DeviceDetail from './components/DeviceDetail';
import UploadValidator from './components/UploadValidator';

import UserManagement from './components/UserManagement';
import CSVIngestion from './components/CSVIngestion';
import Login from './components/Login';
import './global.css';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    
    // Check for existing auth on mount
    const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
    const viewerMode = sessionStorage.getItem('viewerMode');
    
    this.state = {
      // Authentication state
      isAuthenticated: false,
      authToken: null,
      currentUser: null,
      authLoading: true,
      
      // App state
      currentView: 'dashboard',
      sidebarOpen: true,
      selectedDevice: null
    };
    
    // If viewer mode, grant access without token
    if (viewerMode === 'true') {
      this.state.isAuthenticated = true;
      this.state.currentUser = { role: 'VIEWER', fullName: 'Viewer' };
      this.state.authLoading = false;
    }
    // If token exists, verify it
    else if (authToken && userInfo) {
      this.state.authToken = authToken;
      try {
        this.state.currentUser = JSON.parse(userInfo);
      } catch (e) {
        console.error('Failed to parse user info');
      }
    }
  }

  async componentDidMount() {
    // Skip token verification if in viewer mode
    if (this.state.currentUser?.role === 'VIEWER' && !this.state.authToken) {
      return;
    }

    // Verify existing token if present
    const { authToken } = this.state;
    
    if (authToken) {
      await this.verifyToken(authToken);
    } else {
      this.setState({ authLoading: false });
    }
  }

  verifyToken = async (token) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.setState({
          isAuthenticated: true,
          currentUser: data.user,
          authLoading: false
        });
      } else {
        // Token invalid, clear it
        this.handleLogout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      this.handleLogout();
    }
  }

  handleLoginSuccess = (token, user) => {
    // Clear viewer mode if logging in
    sessionStorage.removeItem('viewerMode');
    this.setState({
      isAuthenticated: true,
      authToken: token,
      currentUser: user,
      authLoading: false
    });
  }

  handleViewerAccess = () => {
    sessionStorage.setItem('viewerMode', 'true');
    this.setState({
      isAuthenticated: true,
      authToken: null,
      currentUser: { role: 'VIEWER', fullName: 'Viewer' },
      authLoading: false,
      currentView: 'dashboard'
    });
  }

  handleLogout = () => {
    // Clear storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userInfo');
    sessionStorage.removeItem('viewerMode');
    
    // Reset state
    this.setState({
      isAuthenticated: false,
      authToken: null,
      currentUser: null,
      authLoading: false,
      currentView: 'dashboard'
    });
  }

  navigate = (view) => {
    this.setState({ currentView: view, selectedDevice: null });
  }

  handleDeviceSelect = (device) => {
    this.setState({ 
      selectedDevice: device,
      currentView: 'device-detail'
    });
  }

  handleBackToExplorer = () => {
    this.setState({ 
      selectedDevice: null,
      currentView: 'explorer'
    });
  }

  toggleSidebar = () => {
    this.setState(prevState => ({
      sidebarOpen: !prevState.sidebarOpen
    }));
  }

  renderCurrentView = () => {
    const { currentView, selectedDevice, currentUser, authToken } = this.state;

    switch (currentView) {
      case 'dashboard':
        return <Dashboard onDeviceSelect={this.handleDeviceSelect} />;
      case 'explorer':
        return <DeviceExplorer onDeviceSelect={this.handleDeviceSelect} />;
      case 'device-detail':
        return (
          <DeviceDetail 
            device={selectedDevice} 
            onBack={this.handleBackToExplorer}
            userRole={currentUser?.role}
            authToken={authToken}
          />
        );
      case 'upload':
        return <UploadValidator />;
      case 'user-management':
        return <UserManagement />;
      case 'csv-ingestion':
        return <CSVIngestion />;
      default:
        return <Dashboard onDeviceSelect={this.handleDeviceSelect} />;
    }
  }

  render() {
    const { currentView, sidebarOpen, isAuthenticated, authLoading, currentUser } = this.state;

    // Show loading screen while verifying token
    if (authLoading) {
      return (
        <div className="app-container" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100vh'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(59, 130, 246, 0.2)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
          </div>
        </div>
      );
    }

    // Show login page if not authenticated
    if (!isAuthenticated) {
      return <Login onLoginSuccess={this.handleLoginSuccess} onViewerAccess={this.handleViewerAccess} />;
    }

    const isViewer = currentUser?.role === 'VIEWER' && !this.state.authToken;

    // Show main app if authenticated
    return (
      <div className="app-container">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <div className="logo-section">
              <div className="logo-icon">📦</div>
              {sidebarOpen && (
                <div className="logo-text">
                  <div className="logo-title">Device Portal</div>
                  <div className="logo-subtitle">Asset Management</div>
                </div>
              )}
            </div>
            <button className="sidebar-toggle" onClick={this.toggleSidebar}>
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>

          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => this.navigate('dashboard')}
            >
              <span className="nav-icon">📊</span>
              {sidebarOpen && <span className="nav-label">Dashboard</span>}
            </button>

            <button 
              className={`nav-item ${currentView === 'explorer' ? 'active' : ''}`}
              onClick={() => this.navigate('explorer')}
            >
              <span className="nav-icon">🔍</span>
              {sidebarOpen && <span className="nav-label">Device Explorer</span>}
            </button>


            

            {/* POC-only: CSV Ingestion */}
            {(currentUser?.role === 'POC' || currentUser?.role === 'ADMIN') && (
              <button 
                className={`nav-item ${currentView === 'csv-ingestion' ? 'active' : ''}`}
                onClick={() => this.navigate('csv-ingestion')}
              >
                <span className="nav-icon">📊</span>
                {sidebarOpen && <span className="nav-label">CSV Ingestion</span>}
              </button>
            )}

            {/* ADMIN-only: User Management */}
            {currentUser?.role === 'ADMIN' && (
              <button 
                className={`nav-item ${currentView === 'user-management' ? 'active' : ''}`}
                onClick={() => this.navigate('user-management')}
              >
                <span className="nav-icon">👥</span>
                {sidebarOpen && <span className="nav-label">User Management</span>}
              </button>
            )}
          </nav>

          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="user-avatar">
                {currentUser?.role === 'ADMIN' ? '👑' : 
                 currentUser?.role === 'POC' ? '👤' : '👁️'}
              </div>
              {sidebarOpen && (
                <div className="user-info">
                  <div className="user-name">{currentUser?.fullName || 'User'}</div>
                  <div className="user-role">{currentUser?.role || 'VIEWER'}</div>
                </div>
              )}
            </div>
            {sidebarOpen && (
              isViewer ? (
                <button 
                  className="logout-button"
                  onClick={this.handleLogout}
                  title="Go to Login"
                >
                  🔐 Login
                </button>
              ) : (
                <button 
                  className="logout-button"
                  onClick={this.handleLogout}
                  title="Logout"
                >
                  🚪 Logout
                </button>
              )
            )}
          </div>
        </aside>

        <main className="main-content">
          {this.renderCurrentView()}
        </main>
      </div>
    );
  }
}

export default App;
