const API_URL = '/api';

const api = {
    getToken() {
        return localStorage.getItem('access_token');
    },
    
    setToken(token) {
        localStorage.setItem('access_token', token);
    },

    clearToken() {
        localStorage.removeItem('access_token');
    },

    async request(endpoint, options = {}) {
        const token = this.getToken();
        const headers = {
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (options.body && !(options.body instanceof FormData)) {
            if (!headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);
            
            if (response.status === 401 && endpoint !== '/auth/login') {
                this.clearToken();
                window.location.href = '/';
                return null;
            }

            const data = await response.json();
            
            if (!response.ok) {
                let errorMessage = 'API Error';
                if (data.detail) {
                    if (Array.isArray(data.detail)) {
                        errorMessage = data.detail.map(e => e.msg).join(', ');
                    } else {
                        errorMessage = data.detail;
                    }
                }
                throw new Error(errorMessage);
            }
            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }
};
