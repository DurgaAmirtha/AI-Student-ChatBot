const API_BASE_URL = '/api';

export const tokenService = {
  getToken: () => localStorage.getItem('student_ai_token'),
  setToken: (token) => localStorage.setItem('student_ai_token', token),
  removeToken: () => localStorage.removeItem('student_ai_token'),
  getUser: () => {
    const userStr = localStorage.getItem('student_ai_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('student_ai_user', JSON.stringify(user)),
  removeUser: () => localStorage.removeItem('student_ai_user'),
};

export async function apiRequest(endpoint, options = {}) {
  const token = tokenService.getToken();
  
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
      tokenService.removeToken();
      tokenService.removeUser();
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login?session_expired=true';
      }
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();

    if (!response.ok) {
      let errorMsg = 'An error occurred';
      if (data.detail) {
        if (Array.isArray(data.detail)) {
          errorMsg = data.detail.map((err) => err.msg || err.detail).join(', ');
        } else {
          errorMsg = data.detail;
        }
      }
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}
