import React, { Component } from 'react';
import { authAPI } from '../../services/api';
import './index.css';

class UserManagement extends Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
      loading: true,
      error: null,
      
      // Create user form
      showCreateForm: false,
      creating: false,
      createError: null,
      createSuccess: false,
      
      formData: {
        ntid: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'VIEWER',
        fullName: '',
        department: ''
      }
    };
  }

  async componentDidMount() {
    await this.fetchUsers();
  }

  fetchUsers = async () => {
    try {
      this.setState({ loading: true, error: null });
      
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await authAPI.getAllUsers(token);
      
      this.setState({
        users: response.data.users,
        loading: false
      });
    } catch (error) {
      this.setState({
        error: error.response?.data?.error || 'Failed to load users',
        loading: false
      });
    }
  }

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        [name]: value
      },
      createError: null
    }));
  }

  handleToggleCreateForm = () => {
    this.setState(prevState => ({
      showCreateForm: !prevState.showCreateForm,
      createError: null,
      createSuccess: false,
      formData: {
        ntid: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'VIEWER',
        fullName: '',
        department: ''
      }
    }));
  }

  handleCreateUser = async (e) => {
    e.preventDefault();
    
    const { formData } = this.state;
    
    // Validation
    if (!formData.ntid || !formData.email || !formData.password) {
      this.setState({ createError: 'NTID, Email, and Password are required' });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      this.setState({ createError: 'Passwords do not match' });
      return;
    }
    
    if (formData.password.length < 8) {
      this.setState({ createError: 'Password must be at least 8 characters' });
      return;
    }
    
    try {
      this.setState({ creating: true, createError: null });
      
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const userData = {
        ntid: formData.ntid,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        fullName: formData.fullName || undefined,
        department: formData.department || undefined
      };
      
      await authAPI.createUser(userData, token);
      
      this.setState({
        creating: false,
        createSuccess: true,
        showCreateForm: false,
        formData: {
          ntid: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'VIEWER',
          fullName: '',
          department: ''
        }
      });
      
      // Refresh user list
      await this.fetchUsers();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        this.setState({ createSuccess: false });
      }, 3000);
      
    } catch (error) {
      this.setState({
        creating: false,
        createError: error.response?.data?.error || 'Failed to create user'
      });
    }
  }

  renderCreateUserForm() {
    const { formData, creating, createError } = this.state;
    
    return (
      <div className="create-user-form glass-panel">
        <div className="form-header">
          <h3>Create New User</h3>
          <button className="btn-close" onClick={this.handleToggleCreateForm}>×</button>
        </div>
        
        {createError && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{createError}</span>
          </div>
        )}
        
        <form onSubmit={this.handleCreateUser}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="ntid">NTID *</label>
              <input
                type="text"
                id="ntid"
                name="ntid"
                value={formData.ntid}
                onChange={this.handleInputChange}
                placeholder="Enter NTID"
                required
                disabled={creating}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={this.handleInputChange}
                placeholder="user@comcast.com"
                required
                disabled={creating}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={this.handleInputChange}
                placeholder="Min 8 characters"
                required
                disabled={creating}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={this.handleInputChange}
                placeholder="Re-enter password"
                required
                disabled={creating}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="role">Role *</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={this.handleInputChange}
                disabled={creating}
              >
                <option value="VIEWER">VIEWER</option>
                <option value="POC">POC</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={this.handleInputChange}
                placeholder="John Doe"
                disabled={creating}
              />
            </div>
            
            <div className="form-group full-width">
              <label htmlFor="department">Department</label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={this.handleInputChange}
                placeholder="Engineering"
                disabled={creating}
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={this.handleToggleCreateForm}
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  render() {
    const { users, loading, error, showCreateForm, createSuccess } = this.state;
    
    if (loading) {
      return (
        <div className="user-management-container">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading users...</p>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="user-management-container">
          <div className="error-state">
            <p>⚠️ {error}</p>
            <button className="btn btn-primary" onClick={this.fetchUsers}>
              Retry
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="user-management-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Manage system users and permissions</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={this.handleToggleCreateForm}
            disabled={showCreateForm}
          >
            ➕ Create User
          </button>
        </div>
        
        {createSuccess && (
          <div className="alert alert-success">
            <span>✓</span>
            <span>User created successfully!</span>
          </div>
        )}
        
        {showCreateForm && this.renderCreateUserForm()}
        
        <div className="users-list glass-panel">
          <div className="table-header">
            <h3>All Users ({users.length})</h3>
          </div>
          
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>NTID</th>
                  <th>Email</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.userId}>
                    <td className="mono">{user.ntid}</td>
                    <td>{user.email}</td>
                    <td>{user.fullName || '-'}</td>
                    <td>
                      <span className={`role-badge role-${user.role.toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.department || '-'}</td>
                    <td>
                      <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}

export default UserManagement;
