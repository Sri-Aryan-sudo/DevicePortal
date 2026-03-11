import React, { Component } from 'react';
import Dashboard from './components/Dashboard';
import DeviceExplorer from './components/DeviceExplorer';
import DeviceDetail from './components/DeviceDetail';
import UploadValidator from './components/UploadValidator';

import './global.css';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentView: 'dashboard',
      sidebarOpen: true,
      selectedDevice: null
    };
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
    const { currentView, selectedDevice } = this.state;

    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'explorer':
        return <DeviceExplorer onDeviceSelect={this.handleDeviceSelect} />;
      case 'device-detail':
        return <DeviceDetail device={selectedDevice} onBack={this.handleBackToExplorer} />;
      case 'upload':
        return <UploadValidator />;
      
      default:
        return <Dashboard />;
    }
  }

  render() {
    const { currentView, sidebarOpen } = this.state;

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

            <button 
              className={`nav-item ${currentView === 'upload' ? 'active' : ''}`}
              onClick={() => this.navigate('upload')}
            >
              <span className="nav-icon">⬆️</span>
              {sidebarOpen && <span className="nav-label">Upload Validator</span>}
            </button>

            
          </nav>

          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="user-avatar">👤</div>
              {sidebarOpen && (
                <div className="user-info">
                  <div className="user-name">Admin User</div>
                  <div className="user-role">System Administrator</div>
                </div>
              )}
            </div>
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
