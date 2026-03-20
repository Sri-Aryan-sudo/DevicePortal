import React, { Component } from 'react';
import './index.css';

class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      identifier: '', // NTID or Email
      password: '',
      rememberMe: true, // Default to true for persistent login
      loading: false,
      error: null,
      showPassword: false
    };
  }

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ 
      [name]: value,
      error: null // Clear error when user types
    });
  }

  handleTogglePassword = () => {
    this.setState(prevState => ({
      showPassword: !prevState.showPassword
    }));
  }

  handleToggleRememberMe = () => {
    this.setState(prevState => ({
      rememberMe: !prevState.rememberMe
    }));
  }

  handleSubmit = async (e) => {
    e.preventDefault();
    const { identifier, password, rememberMe } = this.state;

    // Validation
    if (!identifier || !password) {
      this.setState({ error: 'Please enter both NTID/Email and password' });
      return;
    }

    this.setState({ loading: true, error: null });

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store token and user info based on rememberMe choice
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('authToken', data.token);
        storage.setItem('userInfo', JSON.stringify(data.user));

        // Call parent callback to update app state
        if (this.props.onLoginSuccess) {
          this.props.onLoginSuccess(data.token, data.user);
        }
      } else {
        this.setState({ 
          error: data.error || 'Login failed. Please check your credentials.',
          loading: false 
        });
      }

    } catch (error) {
      console.error('Login error:', error);
      this.setState({ 
        error: 'Unable to connect to server. Please try again.',
        loading: false 
      });
    }
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit(e);
    }
  }

  render() {
    const { identifier, password, loading, error, showPassword, rememberMe } = this.state;

    return (
      <div className="login-container">
        <div className="login-background">
          <div className="login-orb orb-1"></div>
          <div className="login-orb orb-2"></div>
          <div className="login-orb orb-3"></div>
        </div>

        <div className="login-card glass-panel">
          <div className="login-header">
            <div className="login-logo">
              <div className="logo-icon">🔐</div>
            </div>
            <h1 className="login-title gradient-text">Device Portal</h1>
            <p className="login-subtitle">Sign in to continue</p>
          </div>

          <form className="login-form" onSubmit={this.handleSubmit}>
            {error && (
              <div className="login-error">
                <span className="error-icon">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="identifier" className="form-label">
                NTID or Comcast Email
              </label>
              <input
                type="text"
                id="identifier"
                name="identifier"
                className="form-input"
                placeholder="Enter your NTID or email"
                value={identifier}
                onChange={this.handleInputChange}
                onKeyPress={this.handleKeyPress}
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={this.handleInputChange}
                  onKeyPress={this.handleKeyPress}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={this.handleTogglePassword}
                  disabled={loading}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-group remember-me-group">
              <label className="remember-me-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={this.handleToggleRememberMe}
                  disabled={loading}
                  className="remember-me-checkbox"
                />
                <span className="remember-me-text">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading || !identifier || !password}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="arrow">→</span>
                </>
              )}
            </button>
          </form>

          <div className="login-divider">
            <span className="divider-text">or</span>
          </div>

          <button
            type="button"
            className="viewer-button"
            onClick={this.props.onViewerAccess}
          >
            <span className="viewer-icon">👁️</span>
            <span>Continue as Viewer</span>
          </button>

          <div className="login-footer">
            <p className="login-help">
              Need help? Contact IT Support
            </p>
          </div>
        </div>

        <div className="login-info">
          <p>© 2025 Device Portal. All rights reserved.</p>
        </div>
      </div>
    );
  }
}

export default Login;
