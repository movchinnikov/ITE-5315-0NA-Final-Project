class AuthService {
    constructor() {
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
    }

    
    setAuthData(data) {
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        this.user = data.user;

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
    }

    clearAuthData() {
        this.accessToken = null;
        this.refreshToken = null;
        this.user = null;

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }

    isAuthenticated() {
        return !!this.accessToken && !!this.user;
    }

    getAccessToken() {
        return this.accessToken;
    }

    async refreshTokens() {
        try {
            const response = await $.ajax({
                url: '/auth/refresh',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (response.success) {
                this.setAuthData({
                    accessToken: response.accessToken,
                    refreshToken: response.refreshToken,
                    user: this.user
                });
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuthData();
            return false;
        }
    }

    // Logout
    async logout() {
        try {
            await $.ajax({
                url: '/auth/logout',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            this.clearAuthData();
            this.updateUI();
            window.location.href = '/';
        }
    }

    updateUI() {
        const authSection = $('#auth-section');
        const userSection = $('#user-section');
        const usernameSpan = $('#username');

        if (this.isAuthenticated()) {
            authSection.hide();
            userSection.show();
            usernameSpan.text(this.user.username);
        } else {
            authSection.show();
            userSection.hide();
        }

        $('.btn-rate').prop('disabled', !this.isAuthenticated());
        if (!this.isAuthenticated()) {
            $('.btn-rate').attr('title', 'Please login to rate restaurants');
        }
    }

    setupAjaxInterceptors() {
        const self = this;

        $(document).ajaxSend(function(event, xhr, options) {
            if (self.isAuthenticated() && !options.url.includes('/auth/')) {
                xhr.setRequestHeader('Authorization', `Bearer ${self.accessToken}`);
            }
        });

        $(document).ajaxError(function(event, xhr, options) {
            if (xhr.status === 401 && self.isAuthenticated()) {
                // Token expired, try to refresh
                self.refreshTokens().then(success => {
                    if (success) {
                        // Retry the original request
                        $.ajax(options);
                    }
                });
            }
        });
    }
}

const authService = new AuthService();