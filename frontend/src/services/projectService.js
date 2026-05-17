import api from './api.js';

export const projectService = {
  list: () => api.get('/projects').then(r => r.data.projects),
  get: (id) => api.get(`/projects/${id}`).then(r => r.data.project),
  create: (data) => api.post('/projects', data).then(r => r.data.project),
  update: (id, data) => api.put(`/projects/${id}`, data).then(r => r.data.project),
  remove: (id) => api.delete(`/projects/${id}`),
};
