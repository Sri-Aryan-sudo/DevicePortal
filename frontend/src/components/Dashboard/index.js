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
      placementTypeDistribution: [],
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
      selectedPlacementType: null,
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
        { id: 5, label: 'Placement Types', value: stats.byPlacementType.length.toString(), change: '+12%', trend: 'up', gradient: 'var(--gradient-danger)', type: 'placement_types' }
      ];

      const colors = ['#667eea', '#764ba2', '#4facfe', '#f093fb', '#fee140', '#ff6b6b'];
      const devicesByTeam = stats.byTeam.map((item, index) => ({
        team: item.team_name,
        count: parseInt(item.count),
        color: colors[index % colors.length]
      }));

      const totalPlacementCount = stats.byPlacementType.reduce((sum, p) => sum + parseInt(p.count), 0);
      const placementTypeDistribution = stats.byPlacementType.slice(0, 6).map(p => ({
        placement_type: p.placement_type,
        count: parseInt(p.count),
        percentage: Math.round((parseInt(p.count) / totalPlacementCount) * 100)
      }));

      this.setState({
        kpis,
        devicesByTeam,
        placementTypeDistribution,
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
    
    // All category tiles (PANEL, BOARD, STB) → Vendors first
    if (type === 'PANEL' || type === 'BOARD' || type === 'STB') {
      this.setState({ 
        loadingDrillDown: true, 
        showDrillDown: true,
        drillDownType: 'category',
        drillDownLevel: 'vendor',
        selectedDeviceType: type
      });
      
      try {
        const response = await drillDownAPI.getVendorBreakdownByType(type);
        
        this.setState({
          drillDownType: 'category',
          drillDownLevel: 'vendor',
          drillDownData: response.data.breakdown,
          drillDownDevices: response.data.devices,
          selectedDeviceType: type,
          loadingDrillDown: false,
          selectedVendor: null,
          selectedModelType: null,
          selectedTeam: null
        });
      } catch (error) {
        this.setState({ 
          error: 'Failed to load vendor data', 
          showDrillDown: false, 
          loadingDrillDown: false 
        });
      }
    }
    
    // Total devices drill-down → Vendors first
    else if (type === 'total') {
      this.setState({ 
        loadingDrillDown: true, 
        showDrillDown: true,
        drillDownType: 'total',
        drillDownLevel: 'vendor'
      });
      
      try {
        const response = await drillDownAPI.getAllVendorsBreakdown();
        
        this.setState({
          drillDownType: 'total',
          drillDownLevel: 'vendor',
          drillDownData: response.data.breakdown,
          drillDownDevices: response.data.devices,
          loadingDrillDown: false,
          selectedDeviceType: null,
          selectedVendor: null,
          selectedModelType: null,
          selectedTeam: null
        });
      } catch (error) {
        this.setState({ 
          error: 'Failed to load vendor data', 
          showDrillDown: false, 
          loadingDrillDown: false 
        });
      }
    }
    
    // Placement Types tile
    else if (type === 'placement_types') {
      this.setState({ 
        loadingDrillDown: true, 
        showDrillDown: true,
        drillDownType: 'placement_types',
        drillDownLevel: 'placement_type'
      });
      
      try {
        const response = await drillDownAPI.getAllPlacementTypesBreakdown();
        
        this.setState({
          drillDownType: 'placement_types',
          drillDownLevel: 'placement_type',
          drillDownData: response.data.breakdown,
          drillDownDevices: response.data.devices,
          loadingDrillDown: false,
          selectedDeviceType: null,
          selectedVendor: null,
          selectedModelType: null,
          selectedTeam: null
        });
      } catch (error) {
        this.setState({ 
          error: 'Failed to load placement type data', 
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

  handlePlacementTypeClick = async (placementTypeItem) => {
    this.setState({ loadingDrillDown: true });
    
    try {
      const response = await drillDownAPI.getVendorsByPlacementType(placementTypeItem.placement_type);
      
      this.setState({
        drillDownType: 'placement_types',
        drillDownLevel: 'vendor',
        drillDownData: response.data.breakdown,
        drillDownDevices: response.data.devices,
        selectedPlacementType: placementTypeItem.placement_type,
        selectedVendor: null,
        selectedModelType: null,
        selectedTeam: null,
        loadingDrillDown: false
      });
    } catch (error) {
      this.setState({ 
        error: 'Failed to load vendor data', 
        loadingDrillDown: false 
      });
    }
  }

  handleTeamClick = async (teamItem) => {
    const { selectedDeviceType, selectedVendor, selectedModelType, drillDownType } = this.state;
    this.setState({ loadingDrillDown: true });
    
    try {
      let response;
      
      if (drillDownType === 'total' || drillDownType === 'placement_types') {
        response = await deviceAPI.getDevices({
          vendor: selectedVendor,
          modelType: selectedModelType,
          team: teamItem.team_name,
          page: 1,
          limit: 10000
        });
      } else {
        response = await deviceAPI.getDevices({
          deviceType: selectedDeviceType,
          vendor: selectedVendor,
          modelType: selectedModelType,
          team: teamItem.team_name,
          page: 1,
          limit: 10000
        });
      }
      
      this.setState({
        drillDownLevel: 'devices',
        drillDownData: null,
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

  handleVendorClick = async (vendorItem) => {
    const { selectedDeviceType, drillDownType } = this.state;
    this.setState({ loadingDrillDown: true });
    
    try {
      let response;
      
      if (drillDownType === 'total' || drillDownType === 'placement_types') {
        response = await drillDownAPI.getModelTypesByVendor(vendorItem.vendor);
      } else {
        response = await drillDownAPI.getModelTypesByVendorAndType(selectedDeviceType, vendorItem.vendor);
      }
      
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
    const { selectedDeviceType, selectedVendor, drillDownType } = this.state;
    this.setState({ loadingDrillDown: true });
    
    try {
      let response;
      
      if (drillDownType === 'total' || drillDownType === 'placement_types') {
        response = await drillDownAPI.getTeamsByVendorAndModel(selectedVendor, modelTypeItem.model_type);
      } else {
        response = await drillDownAPI.getTeamsByTypeVendorAndModel(selectedDeviceType, selectedVendor, modelTypeItem.model_type);
      }
      
      this.setState({
        drillDownLevel: 'team',
        drillDownData: response.data.breakdown,
        drillDownDevices: response.data.devices,
        selectedModelType: modelTypeItem.model_type,
        loadingDrillDown: false
      });
    } catch (error) {
      this.setState({ 
        error: 'Failed to load team data', 
        loadingDrillDown: false 
      });
    }
  }

  handleNavigate = (target) => {
    const { drillDownType, selectedDeviceType, selectedVendor, selectedModelType, selectedPlacementType } = this.state;
    
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
        selectedModelType: null,
        selectedPlacementType: null
      });
    }
    else if (target === 'placement_type') {
      // Go back to placement type level
      const kpi = this.state.kpis.find(k => k.type === 'placement_types');
      if (kpi) this.handleKPIClick(kpi);
    }
    else if (target === 'vendor') {
      if (drillDownType === 'placement_types') {
        // Go back to vendor level within placement type
        const placementData = { placement_type: selectedPlacementType };
        this.handlePlacementTypeClick(placementData);
      } else {
        // Go back to vendor level - reload from KPI
        const kpi = this.state.kpis.find(k => 
          drillDownType === 'total' ? k.type === 'total' : k.type === selectedDeviceType
        );
        if (kpi) this.handleKPIClick(kpi);
      }
    }
    else if (target === 'model_type') {
      // Go back to model type level - reload from vendor
      const vendorData = { vendor: selectedVendor };
      this.handleVendorClick(vendorData);
    } 
    else if (target === 'team') {
      // Go back to team level - reload from model type
      const modelTypeData = { model_type: selectedModelType };
      this.handleModelTypeClick(modelTypeData);
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

  renderPlacementTypeDistribution() {
    const { placementTypeDistribution } = this.state;

    return (
      <div className="glass-panel chart-panel">
        <h3 className="panel-title">Placement Type Distribution</h3>
        <div className="vendor-chart">
          {placementTypeDistribution.map((item, index) => (
            <div key={index} className="vendor-item">
              <div className="vendor-header">
                <span className="vendor-name">{item.placement_type}</span>
                <span className="vendor-percentage">{item.percentage}%</span>
              </div>
              <div className="vendor-bar-track">
                <div 
                  className="vendor-bar-fill"
                  style={{ 
                    width: `${item.percentage}%`,
                    animationDelay: `${index * 100}ms`
                  }}
                />
              </div>
              <div className="vendor-count">{item.count.toLocaleString()} devices</div>
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
    const { 
      kpis, loading, error, showDrillDown, drillDownType, drillDownLevel, 
      drillDownData, drillDownDevices, selectedDeviceType, selectedTeam, 
      selectedVendor, selectedModelType, selectedPlacementType, loadingDrillDown 
    } = this.state;

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
          selectedPlacementType={selectedPlacementType}
          loading={loadingDrillDown}
          onDeviceTypeClick={this.handleDeviceTypeClick}
          onTeamClick={this.handleTeamClick}
          onVendorClick={this.handleVendorClick}
          onModelTypeClick={this.handleModelTypeClick}
          onPlacementTypeClick={this.handlePlacementTypeClick}
          onNavigate={this.handleNavigate}
          onDeviceSelect={this.props.onDeviceSelect}
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
            
          </div>
          <div className="chart-column-right">
            {this.renderPlacementTypeDistribution()}
            {this.renderDeviceGrowth()}
          </div>
        </div>
      </div>
    );
  }
}

export default Dashboard;