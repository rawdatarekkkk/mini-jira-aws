import api from './api.js';

export const userService = {
  list: () => api.get('/users').then(r => r.data.users),
  me: () => api.get('/users/me').then(r => r.data.user),
  listByTeam: (teamId) => api.get(`/users/team/${teamId}`).then(r => r.data.users),
};
