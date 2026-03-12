import React, { Component } from 'react';
import './index.css';
import { deviceAPI, drillDownAPI } from '../../services/api';
import DrillDownView from './DrillDownView';

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      kpis: [],
      devicesByTeam: [],
      vendorDistribution: [],
      recentIngestions: [],
      deviceGrowth: [],
      animationComplete: false,
      loading: true,
      error: null,
      
      // Drill-down states
      showDrillDown: false,
      drillDownType: null, // 'category', 'total', 'vendors'
      drillDownLevel: null, // varies by type
      drillDownData: null,
      drillDownDevices: [],
      selectedDeviceType: null,
      selectedTeam: null,
      selectedVendor: null,
      selectedModelType: null,
      loadingDrillDown: false
    };
  }

  async componentDidMount() {
    try {
      const [statsResponse] = await Promise.all([
        deviceAPI.getStatistics()
      ]);

      const stats = statsResponse.data;
      const total = stats.total;

      // Get counts for new device types
      const panelCount = stats.byType.find(t => t.device_type === 'PANEL')?.count || 0;
      const boardCount = stats.byType.find(t => t.device_type === 'BOARD')?.count || 0;
      const stbCount = stats.byType.find(t => t.device_type === 'STB')?.count || 0;

      const kpis = [
        { id: 1, label: 'Total Devices', value: total.toLocaleString(), change: '+8.2%', trend: 'up', gradient: 'var(--gradient-primary)', type: 'total' },
        { id: 2, label: 'PANEL Devices', value: panelCount.toLocaleString(), change: '+5.1%', trend: 'up', gradient: 'var(--gradient-success)', type: 'PANEL' },
        { id: 3, label: 'BOARD Devices', value: boardCount.toLocaleString(), change: '+3.4%', trend: 'up', gradient: 'var(--gradient-info)', type: 'BOARD' },
        { id: 4, label: 'STB Devices', value: stbCount.toLocaleString(), change: '-2.3%', trend: 'down', gradient: 'var(--gradient-warning)', type: 'STB' },
        { id: 5, label: 'Vendors', value: stats.byVendor.length.toString(), change: '+12%', trend: 'up', gradient: 'var(--gradient-danger)', type: 'vendors' }
      ];

      const colors = ['#667eea', '#764ba2', '#4facfe', '#f093fb', '#fee140', '#ff6b6b'];
      const devicesByTeam = stats.byTeam.map((item, index) => ({
        team: item.team_name,
        count: parseInt(item.count),
        color: colors[index % colors.length]
      }));

      const totalVendorCount = stats.byVendor.reduce((sum, v) => sum + parseInt(v.count), 0);
      const vendorDistribution = stats.byVendor.slice(0, 6).map(v => ({
        vendor: v.vendor,
        count: parseInt(v.count),
        percentage: Math.round((parseInt(v.count) / totalVendorCount) * 100)
      }));

      this.setState({
        kpis,
        devicesByTeam,
        vendorDistribution,
        recentIngestions: [],
        deviceGrowth: [],
        loading: false,
        animationComplete: true
      });
    } catch (error) {
      this.setState({ error: 'Failed to load dashboard data', loading: false });
    }
  }

  handleKPIClick = async (kpi) => {
    const { type } = kpi;
    
    // Category drill-down (PANEL, BOARD, STB) - SIMPLIFIED TO 2 LEVELS
    if (type === 'PANEL' || type === 'BOARD' || type === 'STB') {
      this.setState({ 
        loadingDrillDown: true, 
        showDrillDown: true,
        drillDownType: 'category',
        drillDownLevel: 'team',
        selectedDeviceType: type
      });
      
      try {
        const response = await drillDownAPI.getTeamBreakdown(type);
        
        this.setState({
          drillDownType: 'category',
          drillDownLevel: 'team',
          drillDownData: response.data.breakdown,
          drillDownDevices: response.data.devices,
          selectedDeviceType: type,
          loadingDrillDown: false,
          selectedTeam: null,
          selectedVendor: null,
          selectedModelType: null
        });
      } catch (error) {
        this.setState({ 
          error: 'Failed to load team data', 
          showDrillDown: false, 
          loadingDrillDown: false 
        });
      }
    }
    
    // Total devices drill-down - KEEP AS IS
    else if (type === 'total') {
      this.setState({ 
        loadingDrillDown: true, 
        showDrillDown: true,
        drillDownType: 'total',
        drillDownLevel: 'device_type'
      });
      
      try {
        const response = await drillDownAPI.getDeviceTypeBreakdown();
        
        this.setState({
          drillDownType: 'total',
          drillDownLevel: 'device_type',
          drillDownData: response.data.breakdown,
          drillDownDevices: response.data.devices,
          loadingDrillDown: false,
          selectedDeviceType: null,
          selectedTeam: null,
          selectedVendor: null,
          selectedModelType: null
        });
      } catch (error) {
        this.setState({ 
          error: 'Failed to load device type data', 
          showDrillDown: false, 
          loadingDrillDown: false 
        });
      }
    }
    
    // Vendors drill-down - KEEP AS IS
    else if (type === 'vendors') {
      this.setState({ 
        loadingDrillDown: true, 
        showDrillDown: true,
        drillDownType: 'vendors',
        drillDownLevel: 'vendor_only'
      });
      
      try {
        const response = await drillDownAPI.getAllVendorsBreakdown();
        
        this.setState({
          drillDownType: 'vendors',
          drillDownLevel: 'vendor_only',
          drillDownData: response.data.breakdown,
          drillDownDevices: response.data.devices,
          loadingDrillDown: false,
          selectedDeviceType: null,
          selectedTeam: null,
          selectedVendor: null,
          selectedModelType: null
        });
      } catch (error) {
        this.setState({ 
          error: 'Failed to load vendor data', 
          showDrillDown: false, 
          loadingDrillDown: false 
        });
      }
    }
  }

  handleDeviceTypeClick = async (deviceTypeItem) => {
    this.setState({ loadingDrillDown: true });
    
    try {
      const response = await drillDownAPI.getTeamBreakdownForType(deviceTypeItem.device_type);
      
      this.setState({
        drillDownType: 'total',
        drillDownLevel: 'team_from_total',
        drillDownData: response.data.breakdown,
        drillDownDevices: response.data.devices,
        selectedDeviceType: deviceTypeItem.device_type,
        loadingDrillDown: false
      });
    } catch (error) {
      this.setState({ 
        error: 'Failed to load team data', 
        loadingDrillDown: false 
      });
    }
  }

  handleTeamClick = async (teamItem) => {
    const { selectedDeviceType, drillDownType } = this.state;
    this.setState({ loadingDrillDown: true });
    
    // For category drill-down: Team → Devices (SIMPLIFIED - NO VENDOR/MODEL LEVELS)
    if (drillDownType === 'category') {
      try {
        // Fetch devices for this device type + team combination
        const params = {
          deviceType: selectedDeviceType,
          team: teamItem.team_name,
          page: 1,
          limit: 10000 // Get all devices
        };
        
        const response = await deviceAPI.getDevices(params);
        
        this.setState({
          drillDownLevel: 'devices',
          drillDownData: null, // No more breakdown, just devices
          drillDownDevices: response.data.devices,
          selectedTeam: teamItem.team_name,
          loadingDrillDown: false
        });
      } catch (error) {
        this.setState({ 
          error: 'Failed to load devices', 
          loadingDrillDown: false 
        });
      }
    }
    // For total drill-down: Keep existing vendor breakdown
    else {
      try {
        const response = await drillDownAPI.getVendorBreakdown(selectedDeviceType, teamItem.team_name);
        
        this.setState({
          drillDownLevel: 'vendor',
          drillDownData: response.data.breakdown,
          drillDownDevices: response.data.devices,
          selectedTeam: teamItem.team_name,
          loadingDrillDown: false
        });
      } catch (error) {
        this.setState({ 
          error: 'Failed to load vendor data', 
          loadingDrillDown: false 
        });
      }
    }
  }

  handleVendorClick = async (vendorItem) => {
    const { selectedDeviceType, selectedTeam } = this.state;
    this.setState({ loadingDrillDown: true });
    
    try {
      const response = await drillDownAPI.getModelTypeBreakdown(selectedDeviceType, selectedTeam, vendorItem.vendor);
      
      this.setState({
        drillDownLevel: 'model_type',
        drillDownData: response.data.breakdown,
        drillDownDevices: response.data.devices,
        selectedVendor: vendorItem.vendor,
        loadingDrillDown: false
      });
    } catch (error) {
      this.setState({ 
        error: 'Failed to load model type data', 
        loadingDrillDown: false 
      });
    }
  }

  handleModelTypeClick = async (modelTypeItem) => {
    const { selectedDeviceType, selectedTeam, selectedVendor } = this.state;
    this.setState({ loadingDrillDown: true });
    
    try {
      const response = await drillDownAPI.getDeviceList(selectedDeviceType, selectedTeam, selectedVendor, modelTypeItem.model_type);
      
      this.setState({
        drillDownLevel: 'devices',
        drillDownDevices: response.data.devices,
        drillDownData: null,
        selectedModelType: modelTypeItem.model_type,
        loadingDrillDown: false
      });
    } catch (error) {
      this.setState({ 
        error: 'Failed to load device list', 
        loadingDrillDown: false 
      });
    }
  }

  handleNavigate = (target) => {
    const { drillDownType, selectedDeviceType, selectedTeam, selectedVendor } = this.state;
    
    if (target === 'dashboard') {
      this.setState({
        showDrillDown: false,
        drillDownType: null,
        drillDownLevel: null,
        drillDownData: null,
        drillDownDevices: [],
        selectedDeviceType: null,
        selectedTeam: null,
        selectedVendor: null,
        selectedModelType: null
      });
    } 
    else if (target === 'device_type' && drillDownType === 'total') {
      // Go back to device type level
      const kpi = this.state.kpis.find(k => k.type === 'total');
      if (kpi) this.handleKPIClick(kpi);
    }
    else if (target === 'team') {
      if (drillDownType === 'total') {
        // Re-load team view for selected device type
        const deviceTypeData = { device_type: selectedDeviceType };
        this.handleDeviceTypeClick(deviceTypeData);
      } else {
        // Re-load team view for category
        const kpi = this.state.kpis.find(k => k.type === selectedDeviceType);
        if (kpi) this.handleKPIClick(kpi);
      }
    } 
    else if (target === 'vendor') {
      // Re-load vendor view
      const teamData = { team_name: selectedTeam };
      this.handleTeamClick(teamData);
    } 
    else if (target === 'model_type') {
      // Re-load model type view
      const vendorData = { vendor: selectedVendor };
      this.handleVendorClick(vendorData);
    }
  }

  renderKPICard(kpi, index) {
    const { animationComplete } = this.state;
    return (
      <div 
        key={kpi.id}
        className={`kpi-card ${animationComplete ? 'animate-in' : ''} clickable`}
        style={{ 
          animationDelay: `${index * 100}ms`,
          background: kpi.gradient,
          cursor: 'pointer'
        }}
        onClick={() => this.handleKPIClick(kpi)}
      >
        <div className="kpi-header">
          <span className="kpi-label">{kpi.label}</span>
          <span className={`kpi-trend trend-${kpi.trend}`}>
            {kpi.trend === 'up' ? '↑' : '↓'} {kpi.change}
          </span>
        </div>
        <div className="kpi-value">{kpi.value}</div>
        <div className="kpi-sparkline">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="sparkline-bar"
              style={{ height: `${Math.random() * 100}%` }}
            />
          ))}
        </div>
        <div className="kpi-click-hint">Click to explore →</div>
      </div>
    );
  }

  renderDevicesByTeam() {
    const { devicesByTeam } = this.state;
    const maxCount = Math.max(...devicesByTeam.map(d => d.count));

    return (
      <div className="glass-panel chart-panel">
        <h3 className="panel-title">Devices by Team</h3>
        <div className="team-chart">
          {devicesByTeam.map((item, index) => (
            <div key={index} className="team-row">
              <div className="team-info">
                <div 
                  className="team-color-dot" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="team-name">{item.team}</span>
              </div>
              <div className="team-bar-container">
                <div 
                  className="team-bar"
                  style={{ 
                    width: `${(item.count / maxCount) * 100}%`,
                    background: item.color
                  }}
                >
                  <span className="team-count">{item.count.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  renderVendorDistribution() {
    const { vendorDistribution } = this.state;

    return (
      <div className="glass-panel chart-panel">
        <h3 className="panel-title">Vendor Distribution</h3>
        <div className="vendor-chart">
          {vendorDistribution.map((vendor, index) => (
            <div key={index} className="vendor-item">
              <div className="vendor-header">
                <span className="vendor-name">{vendor.vendor}</span>
                <span className="vendor-percentage">{vendor.percentage}%</span>
              </div>
              <div className="vendor-bar-track">
                <div 
                  className="vendor-bar-fill"
                  style={{ 
                    width: `${vendor.percentage}%`,
                    animationDelay: `${index * 100}ms`
                  }}
                />
              </div>
              <div className="vendor-count">{vendor.count.toLocaleString()} devices</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  renderRecentIngestions() {
    const { recentIngestions } = this.state;

    return (
      <div className="glass-panel chart-panel">
        <h3 className="panel-title">
          Real-time Ingestion Status
          <span className="live-indicator">
            <span className="pulse-dot" />
            Live
          </span>
        </h3>
        <div className="ingestion-list">
          {recentIngestions.map((item, index) => (
            <div key={item.id} className="ingestion-item">
              <div className="ingestion-icon">
                {item.status === 'success' && <span className="icon-check">✓</span>}
                {item.status === 'processing' && <div className="spinner-small" />}
              </div>
              <div className="ingestion-details">
                <div className="ingestion-filename">{item.filename}</div>
                <div className="ingestion-meta">
                  {item.rows.toLocaleString()} rows • {item.timestamp}
                </div>
              </div>
              <div className={`ingestion-status status-${item.status}`}>
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  renderDeviceGrowth() {
    const { deviceGrowth } = this.state;
    const maxCount = Math.max(...deviceGrowth.map(d => d.count));

    return (
      <div className="glass-panel chart-panel growth-panel">
        <h3 className="panel-title">Device Growth Trend</h3>
        <div className="growth-chart">
          <div className="chart-grid">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid-line" />
            ))}
          </div>
          <div className="chart-bars">
            {deviceGrowth.map((item, index) => (
              <div key={index} className="chart-column">
                <div 
                  className="chart-bar"
                  style={{ 
                    height: `${(item.count / maxCount) * 100}%`,
                    animationDelay: `${index * 80}ms`
                  }}
                >
                  <div className="bar-tooltip">
                    {item.count.toLocaleString()}
                  </div>
                </div>
                <div className="chart-label">{item.month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { kpis, loading, error, showDrillDown, drillDownType, drillDownLevel, drillDownData, drillDownDevices, selectedDeviceType, selectedTeam, selectedVendor, selectedModelType, loadingDrillDown } = this.state;

    // Show drill-down view instead of dashboard
    if (showDrillDown) {
      return (
        <DrillDownView
          type={drillDownType}
          level={drillDownLevel}
          data={drillDownData}
          devices={drillDownDevices}
          selectedDeviceType={selectedDeviceType}
          selectedTeam={selectedTeam}
          selectedVendor={selectedVendor}
          selectedModelType={selectedModelType}
          loading={loadingDrillDown}
          onDeviceTypeClick={this.handleDeviceTypeClick}
          onTeamClick={this.handleTeamClick}
          onVendorClick={this.handleVendorClick}
          onModelTypeClick={this.handleModelTypeClick}
          onNavigate={this.handleNavigate}
        />
      );
    }

    if (loading) {
      return (
        <div className="dashboard-container">
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading dashboard...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="dashboard-container">
          <div className="error-state">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title gradient-text">Executive Dashboard</h1>
            <p className="dashboard-subtitle">Real-time device inventory analytics</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary">
              <span>↻</span> Refresh
            </button>
            <button className="btn btn-primary">
              <span>⤓</span> Export Report
            </button>
          </div>
        </div>

        <div className="kpi-grid">
          {kpis.map((kpi, index) => this.renderKPICard(kpi, index))}
        </div>

        <div className="charts-grid">
          <div className="chart-column-left">
            {this.renderDevicesByTeam()}
            {this.renderRecentIngestions()}
          </div>
          <div className="chart-column-right">
            {this.renderVendorDistribution()}
            {this.renderDeviceGrowth()}
          </div>
        </div>
      </div>
    );
  }
}

export default Dashboard;
