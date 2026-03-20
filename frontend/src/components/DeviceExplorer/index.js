import React, { Component } from 'react';
import { deviceAPI } from '../../services/api';
import ExplorerHeader from './ExplorerHeader';
import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';
import DeviceTable from './DeviceTable';
import Pagination from './Pagination';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import './index.css';

class DeviceExplorer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      devices: [],
      filteredDevices: [],
      searchQuery: '',
      filterPanelOpen: false,
      selectedFilters: {
        deviceType: [],
        vendor: [],
        team: []
      },
      filterOptions: {
        deviceTypes: [],
        vendors: [],
        teams: []
      },
      sortBy: 'mac_address',
      sortOrder: 'asc',
      selectedDevice: null,
      currentPage: 1,
      itemsPerPage: 15,
      totalRecords: 0,
      loading: true,
      error: null
    };

    this.searchDebounceTimer = null;

    this.handleSearchChange = this.handleSearchChange.bind(this);
    this.handleSearchClear = this.handleSearchClear.bind(this);
    this.handleToggleFilter = this.handleToggleFilter.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleClearFilters = this.handleClearFilters.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.handleDeviceSelect = this.handleDeviceSelect.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleRetry = this.handleRetry.bind(this);
  }

  componentWillUnmount() {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  async componentDidMount() {
    await this.loadFilterOptions();
    await this.fetchDevices();
  }

  async loadFilterOptions() {
    try {
      const response = await deviceAPI.getFilterOptions();
      this.setState({
        filterOptions: {
          deviceTypes: response.data.deviceTypes,
          vendors: response.data.vendors,
          teams: response.data.teams
        }
      });
    } catch (error) {
      this.setState({ error: 'Failed to load filter options' });
    }
  }

  async fetchDevices() {
    try {
      this.setState({ loading: true });
      const { selectedFilters, sortBy, sortOrder } = this.state;

      // Fetch all devices (no filters sent to backend for multi-select support)
      const params = {
        search: '', 
        deviceType: '',
        vendor: '',
        team: '',
        sortBy,
        sortOrder,
        page: 1,
        limit: 10000 // Get all devices for client-side filtering
      };

      const response = await deviceAPI.getDevices(params);
      
      // Apply filters and search client-side
      let filtered = response.data.devices;
      
      // Apply multi-select filters
      if (selectedFilters.deviceType.length > 0) {
        filtered = filtered.filter(device => 
          selectedFilters.deviceType.includes(device.device_type)
        );
      }
      if (selectedFilters.vendor.length > 0) {
        filtered = filtered.filter(device => 
          selectedFilters.vendor.includes(device.vendor)
        );
      }
      if (selectedFilters.team.length > 0) {
        filtered = filtered.filter(device => 
          selectedFilters.team.includes(device.team_name)
        );
      }
      
      // Apply search query
      filtered = this.filterDevices(filtered, this.state.searchQuery);
      
      this.setState({
        devices: response.data.devices,
        filteredDevices: filtered,
        totalRecords: filtered.length,
        loading: false,
        error: null
      });
    } catch (error) {
      this.setState({ error: 'Failed to load devices', loading: false });
    }
  }

  // Client-side filtering function with flexible search
  filterDevices(devices, searchQuery) {
    if (!searchQuery || searchQuery.trim() === '') {
      return devices;
    }

    // Normalize search query: lowercase, replace underscores with spaces
    const query = searchQuery.toLowerCase().trim().replace(/_/g, ' ');
    
    return devices.filter(device => {
      // Normalize model_type for matching (convert underscores to spaces)
      const normalizedModelType = device.model_type 
        ? device.model_type.toLowerCase().replace(/_/g, ' ')
        : '';
      
      return (
        (device.mac_address && device.mac_address.toLowerCase().includes(query)) ||
        (device.model_name && device.model_name.toLowerCase().includes(query)) ||
        (device.model_alias && device.model_alias.toLowerCase().includes(query)) ||
        (device.vendor && device.vendor.toLowerCase().includes(query)) ||
        (device.team_name && device.team_name.toLowerCase().includes(query)) ||
        // Flexible model_type search: allows partial matches without underscores
        (normalizedModelType && normalizedModelType.includes(query))
      );
    });
  }

  handleSearchChange(e) {
    const newQuery = e.target.value;
    const { devices, selectedFilters } = this.state;
    
    // Apply multi-select filters first
    let filtered = devices;
    if (selectedFilters.deviceType.length > 0) {
      filtered = filtered.filter(device => selectedFilters.deviceType.includes(device.device_type));
    }
    if (selectedFilters.vendor.length > 0) {
      filtered = filtered.filter(device => selectedFilters.vendor.includes(device.vendor));
    }
    if (selectedFilters.team.length > 0) {
      filtered = filtered.filter(device => selectedFilters.team.includes(device.team_name));
    }
    
    // Then apply search
    filtered = this.filterDevices(filtered, newQuery);
    
    this.setState({ 
      searchQuery: newQuery,
      filteredDevices: filtered
    });
  }

  handleSearchClear() {
    const { devices, selectedFilters } = this.state;
    
    // Apply multi-select filters
    let filtered = devices;
    if (selectedFilters.deviceType.length > 0) {
      filtered = filtered.filter(device => selectedFilters.deviceType.includes(device.device_type));
    }
    if (selectedFilters.vendor.length > 0) {
      filtered = filtered.filter(device => selectedFilters.vendor.includes(device.vendor));
    }
    if (selectedFilters.team.length > 0) {
      filtered = filtered.filter(device => selectedFilters.team.includes(device.team_name));
    }
    
    this.setState({ 
      searchQuery: '', 
      filteredDevices: filtered
    });
  }

  handleToggleFilter() {
    this.setState(prevState => ({
      filterPanelOpen: !prevState.filterPanelOpen
    }));
  }

  handleFilterChange(category, value) {
    this.setState(prevState => {
      const currentFilters = [...prevState.selectedFilters[category]];
      const index = currentFilters.indexOf(value);
      
      if (index > -1) {
        currentFilters.splice(index, 1);
      } else {
        currentFilters.push(value);
      }

      return {
        selectedFilters: {
          ...prevState.selectedFilters,
          [category]: currentFilters
        },
        currentPage: 1
      };
    }, () => {
      this.fetchDevices();
    });
  }

  handleClearFilters() {
    this.setState({
      selectedFilters: { deviceType: [], vendor: [], team: [] },
      currentPage: 1
    }, () => {
      this.fetchDevices();
    });
  }

  handleSort(column) {
    this.setState(prevState => {
      const newOrder = prevState.sortBy === column && prevState.sortOrder === 'asc' ? 'desc' : 'asc';
      return {
        sortBy: column,
        sortOrder: newOrder
      };
    }, () => {
      this.fetchDevices();
    });
  }

  handleDeviceSelect(device) {
    this.setState({ selectedDevice: device });
    if (this.props.onDeviceSelect) {
      this.props.onDeviceSelect(device);
    }
  }

  handlePageChange(newPage) {
    this.setState({ currentPage: newPage }, () => {
      this.fetchDevices();
    });
  }

  handleRetry() {
    this.fetchDevices();
  }

  render() {
    const { 
      filteredDevices, 
      searchQuery, 
      filterPanelOpen,
      selectedFilters,
      filterOptions,
      sortBy, 
      sortOrder, 
      currentPage, 
      itemsPerPage, 
      totalRecords, 
      loading, 
      error 
    } = this.state;

    if (loading) {
      return <LoadingState />;
    }

    if (error) {
      return <ErrorState error={error} onRetry={this.handleRetry} />;
    }

    const totalPages = Math.ceil(totalRecords / itemsPerPage);

    return (
      <div className="device-explorer-container">
        <FilterPanel
          isOpen={filterPanelOpen}
          selectedFilters={selectedFilters}
          filterOptions={filterOptions}
          onClose={this.handleToggleFilter}
          onFilterChange={this.handleFilterChange}
          onClearFilters={this.handleClearFilters}
        />

        <div className="explorer-main">
          <ExplorerHeader
            totalRecords={totalRecords}
            onToggleFilter={this.handleToggleFilter}
          />

          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={this.handleSearchChange}
            onSearchClear={this.handleSearchClear}
          />

          <DeviceTable
            devices={filteredDevices}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={this.handleSort}
            onDeviceSelect={this.handleDeviceSelect}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={this.handlePageChange}
          />
        </div>
      </div>
    );
  }
}

export default DeviceExplorer;

