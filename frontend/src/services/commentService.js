import api from './api.js';

export const commentService = {
  list: (taskId) => api.get(`/tasks/${taskId}/comments`).then(r => r.data.comments),
  create: (taskId, text) =>
    api.post(`/tasks/${taskId}/comments`, { text }).then(r => r.data.comment),
};
