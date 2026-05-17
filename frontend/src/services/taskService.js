import api from './api.js';

export const taskService = {
  list: (params = {}) => api.get('/tasks', { params }).then(r => r.data.tasks),
  get: (id) => api.get(`/tasks/${id}`).then(r => r.data.task),
  create: (data) => api.post('/tasks', data).then(r => r.data.task),
  update: (id, data) => api.put(`/tasks/${id}`, data).then(r => r.data.task),
  updateStatus: (id, status) =>
    api.patch(`/tasks/${id}/status`, { status }).then(r => r.data.task),
  remove: (id) => api.delete(`/tasks/${id}`),
  getActivity: (id) => api.get(`/tasks/${id}/activity`).then(r => r.data.activity),
  uploadImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/upload', form).then(r => r.data.key);
  },
};
