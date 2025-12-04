class ClientAuth {
    constructor() {
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.initializeEventHandlers();
    }

    initializeEventHandlers() {
        $(document).ready(() => {
            $('#login-btn').on('click', () => this.showLoginModal());
            $('#signup-btn').on('click', () => this.showSignupModal());
            $('#logout-btn').on('click', () => this.logout());
            
            $('.close, #cancel-auth').on('click', () => this.closeAuthModal());
            $('#auth-switch-btn').on('click', () => this.toggleAuthMode());
            $('#auth-form').on('submit', (e) => this.handleAuthSubmit(e));
            
            this.setupAjaxInterceptors();
            this.updateUI();
            this.loadCurrentUser();
        });
    }

    setAuthData(data) {
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        this.user = data.user;

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        this.updateUI();
    }

    clearAuthData() {
        this.accessToken = null;
        this.refreshToken = null;
        this.user = null;

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        this.updateUI();
    }

    isAuthenticated() {
        return !!this.accessToken && !!this.user;
    }

    getAccessToken() {
        return this.accessToken;
    }

    async refreshTokens() {
        if (!this.refreshToken) {
            this.clearAuthData();
            return false;
        }

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
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuthData();
            return false;
        }
    }

    async loadCurrentUser() {
        try {
            const response = await $.ajax({
                url: '/auth/me',
                method: 'GET'
            });

            if (response.success && response.user) {
                this.user = response.user;
                localStorage.setItem('user', JSON.stringify(response.user));
                this.updateUI();
            }
        } catch (error) {
            console.log('No user session found');
        }
    }

    async logout() {
        if (this.isAuthenticated()) {
            try {
                await $.ajax({
                    url: '/auth/logout',
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });
            } catch (error) {
                console.log('Logout API call failed:', error);
            }
        }

        this.clearAuthData();
        window.location.href = '/';
    }

    updateUI() {
        const authSection = $('#auth-section');
        const userSection = $('#user-section');
        const usernameSpan = $('#username');

        if (this.isAuthenticated()) {
            authSection.hide();
            userSection.show();
            usernameSpan.text(this.user.username);
            $('.auth-required').prop('disabled', false);
            $('.auth-required').attr('title', '');
        } else {
            authSection.show();
            userSection.hide();
            $('.auth-required').prop('disabled', true);
            $('.auth-required').attr('title', 'Please login to perform this action');
        }
    }

    setupAjaxInterceptors() {
        const self = this;

        $(document).ajaxSend(function(event, xhr, options) {
            if (self.isAuthenticated() && !options.url.includes('/auth/')) {
                xhr.setRequestHeader('Authorization', `Bearer ${self.accessToken}`);
            }
        });

        $(document).ajaxError(async function(event, xhr, options) {
            if (xhr.status === 401 && self.isAuthenticated()) {
                const refreshed = await self.refreshTokens();
                if (refreshed) {
                    $.ajax(options);
                } else {
                    self.logout();
                }
            }
        });
    }

    showLoginModal() {
        $('#auth-modal-title').text('Login');
        $('#auth-submit-btn').text('Login');
        $('#auth-switch-text').text("Don't have an account?");
        $('#auth-switch-btn').text('Sign Up');
        $('#confirm-password-group').hide();
        $('#auth-form')[0].reset();
        $('#auth-message').empty().removeClass('success error');
        $('#auth-modal').show();
    }

    showSignupModal() {
        $('#auth-modal-title').text('Sign Up');
        $('#auth-submit-btn').text('Sign Up');
        $('#auth-switch-text').text('Already have an account?');
        $('#auth-switch-btn').text('Login');
        $('#confirm-password-group').show();
        $('#auth-form')[0].reset();
        $('#auth-message').empty().removeClass('success error');
        $('#auth-modal').show();
    }

    closeAuthModal() {
        $('#auth-modal').hide();
        $('#auth-form')[0].reset();
        $('#auth-message').empty().removeClass('success error');
    }

    toggleAuthMode() {
        if ($('#auth-modal-title').text() === 'Login') {
            this.showSignupModal();
        } else {
            this.showLoginModal();
        }
    }

    async handleAuthSubmit(e) {
        e.preventDefault();
        
        const formData = $('#auth-form').serializeArray();
        const data = {};
        formData.forEach(item => data[item.name] = item.value);
        
        const isLogin = $('#auth-modal-title').text() === 'Login';
        
        if (!data.username || data.username.length < 3) {
            this.showAuthMessage('Username must be at least 3 characters', 'error');
            return;
        }
        
        if (!data.password || data.password.length < 6) {
            this.showAuthMessage('Password must be at least 6 characters', 'error');
            return;
        }
        
        if (!isLogin && data.password !== data.confirmPassword) {
            this.showAuthMessage('Passwords do not match', 'error');
            return;
        }

        const submitBtn = $('#auth-submit-btn');
        const originalText = submitBtn.text();
        submitBtn.prop('disabled', true).text('Processing...');

        try {
            let result;
            if (isLogin) {
                result = await this.login(data.username, data.password);
            } else {
                result = await this.register({
                    username: data.username,
                    password: data.password
                });
            }

            if (result.success) {
                this.showAuthMessage(isLogin ? 'Login successful!' : 'Registration successful!', 'success');
                setTimeout(() => {
                    this.closeAuthModal();
                    window.location.reload();
                }, 1500);
            } else {
                this.showAuthMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.showAuthMessage('An unexpected error occurred', 'error');
        } finally {
            submitBtn.prop('disabled', false).text(originalText);
        }
    }

    showAuthMessage(message, type) {
        $('#auth-message')
            .text(message)
            .removeClass('success error')
            .addClass(type)
            .show();
    }

    async login(username, password) {
        try {
            const response = await $.ajax({
                url: '/auth/login',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ username, password })
            });

            if (response.success) {
                this.setAuthData(response);
                return { success: true, user: response.user };
            } else {
                return { success: false, message: response.message };
            }
        } catch (error) {
            const message = error.responseJSON?.message || 'Login failed. Please try again.';
            return { success: false, message };
        }
    }

    async register(userData) {
        try {
            const response = await $.ajax({
                url: '/auth/register',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(userData)
            });

            if (response.success) {
                this.setAuthData(response);
                return { success: true, user: response.user };
            } else {
                return { success: false, message: response.message };
            }
        } catch (error) {
            const message = error.responseJSON?.message || 'Registration failed. Please try again.';
            return { success: false, message };
        }
    }
}

const authService = new ClientAuth();