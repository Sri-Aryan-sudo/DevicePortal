import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Authentication API
export const authAPI = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  verifyToken: (token) => api.post('/auth/verify', {}, {
    headers: { 'Authorization': `Bearer ${token}` }
  }),
  logout: (token) => api.post('/auth/logout', {}, {
    headers: { 'Authorization': `Bearer ${token}` }
  }),
  getCurrentUser: (token) => api.get('/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  }),
  // ADMIN-only endpoints
  createUser: (userData, token) => api.post('/auth/users', userData, {
    headers: { 'Authorization': `Bearer ${token}` }
  }),
  getAllUsers: (token) => api.get('/auth/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  }),
};

// Device API
export const deviceAPI = {
  getDevices: (params) => api.get('/devices', { params }),
  getDeviceByMac: (mac) => api.get(`/devices/${mac}`),
  getAuditLog: (mac) => api.get(`/devices/${mac}/audit-log`),
  createDevice: (data) => api.post('/devices', data),
  updateDevice: (mac, data) => api.put(`/devices/${mac}`, data),
  updateDeviceByPOC: (mac, data, token) => api.put(`/devices/${mac}/poc-edit`, data, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }),
  deleteDevice: (mac) => api.delete(`/devices/${mac}`),
  getStatistics: () => api.get('/statistics'),
  getFilterOptions: () => api.get('/filter-options'),
  getAllDevices: (params) => api.get('/devices', { params: { ...params, limit: 100000, page: 1 } }),
};

// Drill-Down API
export const drillDownAPI = {
  // Category drill-down (PANEL, BOARD, STB)
  getTeamBreakdown: (deviceType) => api.get(`/drilldown/${deviceType}/teams`),
  getVendorBreakdown: (deviceType, team) => api.get(`/drilldown/${deviceType}/teams/${encodeURIComponent(team)}/vendors`),
  getModelTypeBreakdown: (deviceType, team, vendor) => api.get(`/drilldown/${deviceType}/teams/${encodeURIComponent(team)}/vendors/${encodeURIComponent(vendor)}/models`),
  getDeviceList: (deviceType, team, vendor, modelType) => api.get(`/drilldown/${deviceType}/teams/${encodeURIComponent(team)}/vendors/${encodeURIComponent(vendor)}/models/${encodeURIComponent(modelType)}/devices`),
  
  // Total devices drill-down
  getDeviceTypeBreakdown: () => api.get('/drilldown/total/device-types'),
  getTeamBreakdownForType: (deviceType) => api.get(`/drilldown/total/device-types/${deviceType}/teams`),
  
  // Vendors drill-down
  getAllVendorsBreakdown: () => api.get('/drilldown/vendors/all'),
  
  // NEW: Vendor-first drill-down APIs
  getVendorBreakdownByType: (deviceType) => api.get(`/drilldown/${deviceType}/vendors`),
  getModelTypesByVendor: (vendor) => api.get(`/drilldown/vendors/${encodeURIComponent(vendor)}/models`),
  getModelTypesByVendorAndType: (deviceType, vendor) => api.get(`/drilldown/${deviceType}/vendors/${encodeURIComponent(vendor)}/models`),
  getTeamsByVendorAndModel: (vendor, modelType) => api.get(`/drilldown/vendors/${encodeURIComponent(vendor)}/models/${encodeURIComponent(modelType)}/teams`),
  getTeamsByTypeVendorAndModel: (deviceType, vendor, modelType) => api.get(`/drilldown/${deviceType}/vendors/${encodeURIComponent(vendor)}/models/${encodeURIComponent(modelType)}/teams`),

  // Placement type drill-down APIs
  getAllPlacementTypesBreakdown: () => api.get('/drilldown/placement-types/all'),
  getVendorsByPlacementType: (placementType) => api.get(`/drilldown/placement-types/${encodeURIComponent(placementType)}/vendors`),
};

export default api;
