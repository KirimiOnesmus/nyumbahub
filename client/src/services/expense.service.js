import api, { unwrap } from './axios.js';


export const createExpense = (payload) => unwrap(api.post('/expenses', payload));


export const getExpenses = (buildingId, params = {}) =>
  unwrap(api.get(`/buildings/${buildingId}/expenses`, { params }));

export const getExpenseById = (id) => unwrap(api.get(`/expenses/${id}`));
