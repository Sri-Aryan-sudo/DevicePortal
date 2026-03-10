import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const deviceAPI = {
  getDevices: (params) => api.get('/devices', { params }),
  getDeviceByMac: (mac) => api.get(`/devices/${mac}`),
  createDevice: (data) => api.post('/devices', data),
  updateDevice: (mac, data) => api.put(`/devices/${mac}`, data),
  deleteDevice: (mac) => api.delete(`/devices/${mac}`),
  getStatistics: () => api.get('/statistics'),
  getFilterOptions: () => api.get('/filter-options'),
  getAllDevices: (params) => api.get('/devices', { params: { ...params, limit: 100000, page: 1 } }),
};

export const dataQualityAPI = {
  getQualityMetrics: () => api.get('/data-quality'),
};

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
};

export default api;
