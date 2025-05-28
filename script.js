document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    const strengthBar = document.getElementById('strength-bar');
    const strengthScore = document.getElementById('strength-score');
    const scoreNumber = strengthScore.querySelector('.score-number');
    const feedbackText = document.getElementById('feedback-text');
    const emojiFeedback = document.getElementById('emoji-feedback');
    const crackTime = document.getElementById('crack-time').querySelector('span');
    const toggleVisibility = document.querySelector('.toggle-visibility');
    const copyBtn = document.getElementById('copy-btn');
    const themeToggle = document.querySelector('.theme-toggle');
    const checks = document.querySelectorAll('.check');

    const commonPasswords = ['password123', '123456', 'qwerty', 'admin'];

    // Function to calculate SHA-1 hash (using subtle crypto)
    async function sha1(str) {
        const buffer = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Check if password has been pwned using HIBP API
    async function checkPwned(password) {
        if (!password) return { pwned: false, count: 0 };

        try {
            const hash = await sha1(password);
            const prefix = hash.slice(0, 5);
            const suffix = hash.slice(5).toUpperCase();

            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
                headers: { 'User-Agent': 'PasswordStrengthChecker' }
            });
            const text = await response.text();

            const lines = text.split('\n');
            for (const line of lines) {
                const [hashSuffix, count] = line.split(':');
                if (hashSuffix === suffix) {
                    return { pwned: true, count: parseInt(count, 10) };
                }
            }
            return { pwned: false, count: 0 };
        } catch (error) {
            console.error('Error checking HIBP:', error);
            return { pwned: false, count: 0, error: true };
        }
    }

    function calculateStrength(password) {
        let score = 0;
        const criteria = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /[0-9]/.test(password),
            symbols: /[^A-Za-z0-9]/.test(password)
        };

        if (criteria.length) score += 20;
        if (criteria.uppercase) score += 20;
        if (criteria.lowercase) score += 20;
        if (criteria.numbers) score += 20;
        if (criteria.symbols) score += 20;
        score += Math.min(20, password.length - 8) * 2;
        if (commonPasswords.includes(password.toLowerCase())) score = Math.min(score, 20);

        return Math.min(100, score);
    }

    function estimateCrackTime(score) {
        if (score < 20) return 'Instant';
        if (score < 40) return 'Seconds';
        if (score < 60) return 'Minutes';
        if (score < 80) return 'Hours';
        if (score < 95) return 'Days';
        return 'Centuries';
    }

    async function getFeedback(score, password) {
        if (!password) return 'Start typing to analyze';

        const pwnedResult = await checkPwned(password);
        if (pwnedResult.error) return 'Error checking breach status';
        if (pwnedResult.pwned) {
            return `WARNING: This password was found in ${pwnedResult.count} breaches!`;
        }
        if (commonPasswords.includes(password.toLowerCase())) return 'Warning: Common password detected!';
        if (score < 40) return 'Weak: Add more complexity';
        if (score < 60) return 'Fair: Include diverse characters';
        if (score < 80) return 'Good: Almost there!';
        return 'Excellent: Highly secure!';
    }

    function getEmoji(score, pwned) {
        if (pwned) return '⚠️';
        if (score < 20) return '😞';
        if (score < 40) return '😟';
        if (score < 60) return '😐';
        if (score < 80) return '🙂';
        return '😎';
    }

    async function updateUI() {
        const password = passwordInput.value;
        const score = calculateStrength(password);
        const pwnedResult = await checkPwned(password);

        // Update strength bar and score
        strengthBar.style.setProperty('--strength', `${score}%`);
        scoreNumber.textContent = score;
        strengthScore.style.color = pwnedResult.pwned ? '#ff4d4d' : score < 40 ? '#ff4d4d' : score < 80 ? '#ffcd39' : '#28a745';

        // Update criteria checks
        checks.forEach(check => {
            const criterion = check.parentElement.dataset.criteria;
            const isMet = {
                length: password.length >= 8,
                uppercase: /[A-Z]/.test(password),
                lowercase: /[a-z]/.test(password),
                numbers: /[0-9]/.test(password),
                symbols: /[^A-Za-z0-9]/.test(password)
            }[criterion];
            check.classList.toggle('active', isMet);
        });

        // Update feedback
        feedbackText.textContent = await getFeedback(score, password);
        emojiFeedback.textContent = getEmoji(score, pwnedResult.pwned);
        emojiFeedback.style.transform = `scale(${1 + score/200})`;
        crackTime.textContent = estimateCrackTime(score);

        // Flash warning if pwned
        if (pwnedResult.pwned) {
            feedbackText.style.color = '#ff4d4d';
            feedbackText.style.fontWeight = 'bold';
        } else {
            feedbackText.style.color = 'rgba(255, 255, 255, 0.9)';
            feedbackText.style.fontWeight = 'normal';
        }
    }

    // Debounce function to limit API calls
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Event Listeners
    const debouncedUpdateUI = debounce(updateUI, 500); // Debounce to 500ms
    passwordInput.addEventListener('input', debouncedUpdateUI);

    toggleVisibility.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        toggleVisibility.querySelector('i').classList.toggle('fa-eye');
        toggleVisibility.querySelector('i').classList.toggle('fa-eye-slash');
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(passwordInput.value);
        copyBtn.querySelector('span').textContent = 'Copied!';
        setTimeout(() => copyBtn.querySelector('span').textContent = 'Copy Password', 2000);
    });

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        themeToggle.querySelector('i').classList.toggle('fa-moon');
        themeToggle.querySelector('i').classList.toggle('fa-sun');
    });

    // Initial UI update
    updateUI();
});

// Custom property for strength bar animation
document.styleSheets[0].insertRule(`
    .progress-bar::after {
        width: var(--strength, 0%);
    }
`, 0);