/* ==========================================
   FocusX Application Main Logic
   ================================---------- */

document.addEventListener('DOMContentLoaded', () => {

    // --- State & Configuration Constants ---
    const QUOTES = [
        "\"Focus is a matter of deciding what things you're not going to do.\"",
        "\"The secret of getting ahead is getting started.\"",
        "\"Don't watch the clock; do what it does. Keep going.\"",
        "\"Success usually comes to those who are too busy to be looking for it.\"",
        "\"Concentrate all your thoughts upon the work in hand. The sun's rays do not burn until brought to a focus.\"",
        "\"Deep work is the superpower of the 21st century.\""
    ];

    const DEFAULT_SETTINGS = {
        focusTime: 25,
        shortBreak: 5,
        longBreak: 15,
        dailyGoal: 120, // in minutes
        autoStart: false,
        soundEnabled: true,
        theme: 'dark'
    };

    // --- Application State ---
    let settings = loadSettings();
    let stats = loadStats();
    let tasks = loadTasks();

    // Timer State Variables
    let currentMode = 'focus'; // 'focus' | 'shortBreak' | 'longBreak'
    let timeLeft = settings.focusTime * 60; // in seconds
    let totalDuration = settings.focusTime * 60;
    let timerId = null;
    let isRunning = false;
    let endTime = null;

    // Ambience Audio Simulation State
    let activeAmbience = 'none';
    let audioContext = null;
    let audioNode = null;

    // --- DOM Elements Cache ---
    const DOM = {
        html: document.documentElement,
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        sidebar: document.querySelector('.sidebar'),
        navItems: document.querySelectorAll('.nav-item'),
        contentSections: document.querySelectorAll('.content-section'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        themeIcon: document.getElementById('themeIcon'),
        themeText: document.getElementById('themeText'),
        greetingTitle: document.getElementById('greetingTitle'),
        currentDateDisplay: document.getElementById('currentDateDisplay'),
        motivationalQuote: document.getElementById('motivationalQuote'),
        streakCount: document.getElementById('streakCount'),
        
        // Dashboard Stats
        statTotalTime: document.getElementById('statTotalTime'),
        statSessionsCount: document.getElementById('statSessionsCount'),
        statGoalProgress: document.getElementById('statGoalProgress'),
        statLongestSession: document.getElementById('statLongestSession'),
        heroProgressBar: document.getElementById('heroProgressBar'),
        heroProgressText: document.getElementById('heroProgressText'),
        
        // Task List Elements
        taskForm: document.getElementById('taskForm'),
        taskTitleInput: document.getElementById('taskTitleInput'),
        taskSubjectInput: document.getElementById('taskSubjectInput'),
        taskList: document.getElementById('taskList'),
        taskEmptyState: document.getElementById('taskEmptyState'),
        taskCounterBadge: document.getElementById('taskCounterBadge'),
        
        // Ambience Elements
        ambienceBtns: document.querySelectorAll('.ambience-btn'),
        volumeContainer: document.getElementById('volumeContainer'),
        volumeSlider: document.getElementById('volumeSlider'),
        
        // Timer Elements
        modeBtns: document.querySelectorAll('.mode-btn'),
        timerDisplay: document.getElementById('timerDisplay'),
        timerSubtext: document.getElementById('timerSubtext'),
        currentSessionLabel: document.getElementById('currentSessionLabel'),
        progressRing: document.getElementById('progressRing'),
        startPauseBtn: document.getElementById('startPauseBtn'),
        startPauseIcon: document.getElementById('startPauseIcon'),
        startPauseText: document.getElementById('startPauseText'),
        resetBtn: document.getElementById('resetBtn'),
        skipBtn: document.getElementById('skipBtn'),
        timerCompletedCount: document.getElementById('timerCompletedCount'),
        timerGoalStatusText: document.getElementById('timerGoalStatusText'),
        
        // Detailed Stats Elements
        detailedTotalTime: document.getElementById('detailedTotalTime'),
        detailedSessionsCount: document.getElementById('detailedSessionsCount'),
        detailedLongestSession: document.getElementById('detailedLongestSession'),
        resetStatsBtn: document.getElementById('resetStatsBtn'),
        
        // Settings Form Elements
        settingsForm: document.getElementById('settingsForm'),
        settingFocusTime: document.getElementById('settingFocusTime'),
        settingShortBreak: document.getElementById('settingShortBreak'),
        settingLongBreak: document.getElementById('settingLongBreak'),
        settingDailyGoal: document.getElementById('settingDailyGoal'),
        settingAutoStart: document.getElementById('settingAutoStart'),
        settingSoundEnabled: document.getElementById('settingSoundEnabled'),
        resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
        
        // Audio & Toasts
        alarmAudio: document.getElementById('alarmAudio'),
        toastContainer: document.getElementById('toastContainer')
    };

    // ==========================================
    // Initialization Sequence
    // ==========================================
    function init() {
        checkDateRollover();
        applySettingsToUI();
        applyTheme(settings.theme);
        updateDateTimeGreeting();
        renderDashboardStats();
        renderTasks();
        setupEventListeners();
        updateTimerDisplay();
        
        // Set random motivational quote
        const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        DOM.motivationalQuote.textContent = randomQuote;
    }

    // ==========================================
    // Navigation & Layout Management
    // ==========================================
    function setupEventListeners() {
        // Navigation switching
        DOM.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetID = item.getAttribute('data-target');
                
                DOM.navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                DOM.contentSections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === targetID) {
                        section.classList.add('active');
                    }
                });

                // Close mobile sidebar if open
                DOM.sidebar.classList.remove('mobile-open');
            });
        });

        // Mobile Menu Toggle
        DOM.mobileMenuBtn.addEventListener('click', () => {
            DOM.sidebar.classList.toggle('mobile-open');
        });

        // Theme Toggle Button
        DOM.themeToggleBtn.addEventListener('click', () => {
            const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
            settings.theme = newTheme;
            saveSettings();
            applyTheme(newTheme);
        });

        // --- Timer Mode Buttons ---
        DOM.modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode');
                switchTimerMode(mode);
            });
        });

        // --- Timer Action Buttons ---
        DOM.startPauseBtn.addEventListener('click', toggleTimer);
        DOM.resetBtn.addEventListener('click', resetTimer);
        DOM.skipBtn.addEventListener('click', skipTimer);

        // --- Task Management ---
        DOM.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = DOM.taskTitleInput.value.trim();
            const subject = DOM.taskSubjectInput.value.trim() || 'General';
            
            if (!title) return;

            const newTask = {
                id: Date.now().toString(),
                title,
                subject,
                completed: false
            };

            tasks.push(newTask);
            saveTasks();
            renderTasks();

            DOM.taskTitleInput.value = '';
            DOM.taskSubjectInput.value = '';
            showToast('Task added successfully!', 'success');
        });

        // --- Ambience Sound Controls ---
        DOM.ambienceBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                DOM.ambienceBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const sound = btn.getAttribute('data-sound');
                setAmbienceSound(sound);
            });
        });

        DOM.volumeSlider.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            if (audioNode && audioNode.gain) {
                audioNode.gain.value = vol;
            }
        });

        // --- Settings Management ---
        DOM.settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const fTime = parseInt(DOM.settingFocusTime.value);
            const sBreak = parseInt(DOM.settingShortBreak.value);
            const lBreak = parseInt(DOM.settingLongBreak.value);
            const dGoal = parseInt(DOM.settingDailyGoal.value);

            if (isNaN(fTime) || fTime < 1 || isNaN(dGoal) || dGoal < 5) {
                showToast('Please enter valid positive duration values.', 'warning');
                return;
            }

            settings.focusTime = fTime;
            settings.shortBreak = sBreak;
            settings.longBreak = lBreak;
            settings.dailyGoal = dGoal;
            settings.autoStart = DOM.settingAutoStart.checked;
            settings.soundEnabled = DOM.settingSoundEnabled.checked;

            saveSettings();
            showToast('Preferences saved successfully!', 'success');

            // If timer is not running, update current timer view accordingly
            if (!isRunning) {
                switchTimerMode(currentMode, true);
            }
            renderDashboardStats();
        });

        DOM.resetDefaultsBtn.addEventListener('click', () => {
            settings = { ...DEFAULT_SETTINGS };
            saveSettings();
            applySettingsToUI();
            applyTheme(settings.theme);
            if (!isRunning) switchTimerMode('focus', true);
            showToast('Settings restored to defaults.', 'info');
        });

        // --- Stats Reset Action ---
        DOM.resetStatsBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to reset today's statistics?")) {
                stats.totalFocusTime = 0;
                stats.completedSessions = 0;
                stats.longestSession = 0;
                saveStats();
                renderDashboardStats();
                showToast("Today's statistics have been reset.", 'info');
            }
        });
    }

    // ==========================================
    // Date & Time Greeting Calculations
    // ==========================================
    function updateDateTimeGreeting() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
        DOM.currentDateDisplay.textContent = now.toLocaleDateString('en-US', options);

        const hour = now.getHours();
        let greeting = "Ready to focus?";
        if (hour >= 5 && hour < 12) greeting = "Good morning! Ready to focus?";
        else if (hour >= 12 && hour < 17) greeting = "Good afternoon! Let's stay productive.";
        else if (hour >= 17 && hour < 22) greeting = "Good evening! Wrapping up strong.";
        
        DOM.greetingTitle.textContent = greeting;
    }

    // Check if day changed since last visit to auto-reset daily stats
    function checkDateRollover() {
        const todayStr = new Date().toDateString();
        const lastSavedDate = localStorage.getItem('focusx_last_date');
        
        if (lastSavedDate !== todayStr) {
            // New day detected: reset daily stats counters, keep streak evaluation if needed
            if (lastSavedDate) {
                // If user studied yesterday, keep/increment streak, else reset streak
                const lastDateObj = new Date(lastSavedDate);
                const currentDateObj = new Date(todayStr);
                const diffDays = Math.round((currentDateObj - lastDateObj) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    stats.streak = (stats.streak || 0) + 1;
                } else if (diffDays > 1) {
                    stats.streak = 0;
                }
            }
            stats.totalFocusTime = 0;
            stats.completedSessions = 0;
            stats.longestSession = 0;
            
            localStorage.setItem('focusx_last_date', todayStr);
            saveStats();
        }
    }

    // ==========================================
    // Theme Management
    // ==========================================
    function applyTheme(theme) {
        DOM.html.setAttribute('data-theme', theme);
        if (theme === 'dark') {
            DOM.themeIcon.className = 'fa-solid fa-moon';
            DOM.themeText.textContent = 'Dark Mode';
        } else {
            DOM.themeIcon.className = 'fa-solid fa-sun';
            DOM.themeText.textContent = 'Light Mode';
        }
    }

    // ==========================================
    // Timer Logic (Timestamp Accurate)
    // ==========================================
    function switchTimerMode(mode, forceReset = false) {
        if (isRunning && !forceReset) {
            if (!confirm("Switching modes will stop the active timer. Proceed?")) return;
            pauseTimer();
        }

        currentMode = mode;
        DOM.modeBtns.forEach(btn => {
            if (btn.getAttribute('data-mode') === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Set time based on mode
        if (mode === 'focus') {
            totalDuration = settings.focusTime * 60;
            DOM.currentSessionLabel.textContent = 'Focus';
            DOM.timerSubtext.textContent = 'Time to lock in';
        } else if (mode === 'shortBreak') {
            totalDuration = settings.shortBreak * 60;
            DOM.currentSessionLabel.textContent = 'Short Break';
            DOM.timerSubtext.textContent = 'Take a breather';
        } else if (mode === 'longBreak') {
            totalDuration = settings.longBreak * 60;
            DOM.currentSessionLabel.textContent = 'Long Break';
            DOM.timerSubtext.textContent = 'Rest and recharge';
        }

        timeLeft = totalDuration;
        updateTimerDisplay();

        if (settings.autoStart && forceReset === false) {
            startTimer();
        }
    }

    function toggleTimer() {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

    function startTimer() {
        if (isRunning) return;
        
        isRunning = true;
        endTime = Date.now() + timeLeft * 1000;
        
        DOM.startPauseIcon.className = 'fa-solid fa-pause';
        DOM.startPauseText.textContent = 'Pause';
        DOM.timerSubtext.textContent = currentMode === 'focus' ? 'Deep work in progress...' : 'Relaxing...';

        timerId = setInterval(() => {
            const now = Date.now();
            timeLeft = Math.max(0, Math.ceil((endTime - now) / 1000));
            
            updateTimerDisplay();

            if (timeLeft <= 0) {
                clearInterval(timerId);
                isRunning = false;
                handleSessionComplete();
            }
        }, 250);
    }

    function pauseTimer() {
        if (!isRunning) return;
        clearInterval(timerId);
        isRunning = false;
        
        DOM.startPauseIcon.className = 'fa-solid fa-play';
        DOM.startPauseText.textContent = 'Start';
        DOM.timerSubtext.textContent = 'Timer paused';
    }

    function resetTimer() {
        pauseTimer();
        switchTimerMode(currentMode, true);
    }

    function skipTimer() {
        pauseTimer();
        if (currentMode === 'focus') {
            switchTimerMode('shortBreak');
        } else {
            switchTimerMode('focus');
        }
        showToast('Skipped to next session.', 'info');
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        DOM.timerDisplay.textContent = formatted;
        document.title = `${formatted} — FocusX`;

        // Update circular progress ring
        const circumference = 2 * Math.PI * 125; // r = 125
        const progress = timeLeft / totalDuration;
        const dashOffset = circumference * (1 - progress);
        DOM.progressRing.style.strokeDashoffset = dashOffset;
    }

    function handleSessionComplete() {
        playAudioNotification();

        if (currentMode === 'focus') {
            const focusMinutes = settings.focusTime;
            stats.totalFocusTime += focusMinutes;
            stats.completedSessions += 1;
            if (focusMinutes > stats.longestSession) {
                stats.longestSession = focusMinutes;
            }
            saveStats();
            renderDashboardStats();
            showToast(`Focus session completed! (+${focusMinutes} mins)`, 'success');

            // Suggest short break
            switchTimerMode('shortBreak');
        } else {
            showToast('Break finished! Ready to focus again?', 'info');
            switchTimerMode('focus');
        }

        if (settings.autoStart) {
            startTimer();
        }
    }

    function playAudioNotification() {
        if (!settings.soundEnabled) return;
        try {
            DOM.alarmAudio.currentTime = 0;
            DOM.alarmAudio.play().catch(e => console.log("Audio play blocked by browser policy:", e));
        } catch (err) {
            console.log("Audio notification error:", err);
        }
    }

    // ==========================================
    // Task Management Logic
    // ==========================================
    function renderTasks() {
        DOM.taskList.innerHTML = '';
        
        if (tasks.length === 0) {
            DOM.taskEmptyState.style.display = 'block';
            DOM.taskCounterBadge.textContent = '0 pending';
            return;
        }

        DOM.taskEmptyState.style.display = 'none';
        let pendingCount = 0;

        tasks.forEach(task => {
            if (!task.completed) pendingCount++;

            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.innerHTML = `
                <div class="task-left">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                    <div class="task-details">
                        <span class="task-title" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>
                        <span class="task-subject">${escapeHtml(task.subject)}</span>
                    </div>
                </div>
                <button class="task-delete-btn" data-id="${task.id}" title="Delete Task"><i class="fa-solid fa-trash"></i></button>
            `;

            // Checkbox event
            li.querySelector('.task-checkbox').addEventListener('change', (e) => {
                task.completed = e.target.checked;
                saveTasks();
                renderTasks();
            });

            // Delete button event
            li.querySelector('.task-delete-btn').addEventListener('click', () => {
                tasks = tasks.filter(t => t.id !== task.id);
                saveTasks();
                renderTasks();
                showToast('Task removed.', 'info');
            });

            DOM.taskList.appendChild(li);
        });

        DOM.taskCounterBadge.textContent = `${pendingCount} pending`;
    }

    // ==========================================
    // Statistics & Dashboard Rendering
    // ==========================================
    function renderDashboardStats() {
        const totalMins = stats.totalFocusTime || 0;
        const sessions = stats.completedSessions || 0;
        const goalMins = settings.dailyGoal || 120;
        const longest = stats.longestSession || 0;
        const streak = stats.streak || 1;

        // Stat cards formatting
        DOM.statTotalTime.textContent = formatTimeDisplay(totalMins);
        DOM.statSessionsCount.textContent = sessions;
        
        const goalPercent = Math.min(100, Math.round((totalMins / goalMins) * 100));
        DOM.statGoalProgress.textContent = `${goalPercent}%`;
        DOM.statLongestSession.textContent = `${longest}m`;
        DOM.streakCount.textContent = streak;

        // Hero progress bar
        DOM.heroProgressBar.style.width = `${goalPercent}%`;
        DOM.heroProgressText.textContent = `${totalMins} / ${goalMins} mins`;

        // Timer meta summary
        DOM.timerCompletedCount.textContent = `${sessions} sessions`;
        DOM.timerGoalStatusText.textContent = `${totalMins} / ${goalMins} mins`;

        // Detailed stats section values
        const hours = Math.floor(totalMins / 60);
        const remMins = totalMins % 60;
        DOM.detailedTotalTime.textContent = `${hours} hours ${remMins} mins`;
        DOM.detailedSessionsCount.textContent = `${sessions} sessions`;
        DOM.detailedLongestSession.textContent = `${longest} mins`;
    }

    function formatTimeDisplay(mins) {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }

    // ==========================================
    // Focus Ambience Audio Synthesizer (Graceful)
    // ==========================================
    function setAmbienceSound(soundType) {
        activeAmbience = soundType;
        stopAmbienceAudio();

        if (soundType === 'none') {
            DOM.volumeContainer.style.display = 'none';
            return;
        }

        DOM.volumeContainer.style.display = 'flex';
        
        // Web Audio API simulated generation for ambient noise since external files might fail CORS
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            
            audioContext = new AudioContext();
            const bufferSize = 2 * audioContext.sampleRate;
            const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const output = noiseBuffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                if (soundType === 'whitenoise') {
                    output[i] = Math.random() * 2 - 1;
                } else if (soundType === 'rain') {
                    // Pinkish / filtered rain noise approximation
                    output[i] = (Math.random() * 2 - 1) * 0.2;
                } else if (soundType === 'forest') {
                    output[i] = (Math.random() * 2 - 1) * 0.15;
                }
            }

            const whiteNoise = audioContext.createBufferSource();
            whiteNoise.buffer = noiseBuffer;
            whiteNoise.loop = true;

            // Filter for forest or rain
            const filter = audioContext.createBiquadFilter();
            if (soundType === 'rain') {
                filter.type = 'lowpass';
                filter.frequency.value = 800;
            } else if (soundType === 'forest') {
                filter.type = 'bandpass';
                filter.frequency.value = 1200;
            } else {
                filter.type = 'lowpass';
                filter.frequency.value = 5000;
            }

            audioNode = audioContext.createGain();
            audioNode.gain.value = parseFloat(DOM.volumeSlider.value);

            whiteNoise.connect(filter);
            filter.connect(audioNode);
            audioNode.connect(audioContext.destination);

            whiteNoise.start(0);
        } catch (e) {
            console.log("Web Audio API not supported or restricted:", e);
        }
    }

    function stopAmbienceAudio() {
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(() => {});
            audioContext = null;
            audioNode = null;
        }
    }

    // ==========================================
    // LocalStorage State Handlers
    // ==========================================
    function loadSettings() {
        try {
            const saved = localStorage.getItem('focusx_settings');
            if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch (e) { console.error("Error reading settings", e); }
        return { ...DEFAULT_SETTINGS };
    }

    function saveSettings() {
        try {
            localStorage.setItem('focusx_settings', JSON.stringify(settings));
        } catch (e) { console.error("Error saving settings", e); }
    }

    function loadStats() {
        const defaultStats = { totalFocusTime: 0, completedSessions: 0, longestSession: 0, streak: 1 };
        try {
            const saved = localStorage.getItem('focusx_stats');
            if (saved) return { ...defaultStats, ...JSON.parse(saved) };
        } catch (e) { console.error("Error reading stats", e); }
        return defaultStats;
    }

    function saveStats() {
        try {
            localStorage.setItem('focusx_stats', JSON.stringify(stats));
        } catch (e) { console.error("Error saving stats", e); }
    }

    function loadTasks() {
        try {
            const saved = localStorage.getItem('focusx_tasks');
            if (saved) return JSON.parse(saved);
        } catch (e) { console.error("Error reading tasks", e); }
        return [];
    }

    function saveTasks() {
        try {
            localStorage.setItem('focusx_tasks', JSON.stringify(tasks));
        } catch (e) { console.error("Error saving tasks", e); }
    }

    function applySettingsToUI() {
        DOM.settingFocusTime.value = settings.focusTime;
        DOM.settingShortBreak.value = settings.shortBreak;
        DOM.settingLongBreak.value = settings.longBreak;
        DOM.settingDailyGoal.value = settings.dailyGoal;
        DOM.settingAutoStart.checked = settings.autoStart;
        DOM.settingSoundEnabled.checked = settings.soundEnabled;
    }

    // ==========================================
    // Utilities & Toast Notifications
    // ==========================================
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        let iconClass = 'fa-solid fa-circle-check';
        if (type === 'info') iconClass = 'fa-solid fa-circle-info';
        if (type === 'warning') iconClass = 'fa-solid fa-triangle-exclamation';

        toast.innerHTML = `<i class="${iconClass}"></i><span>${escapeHtml(message)}</span>`;
        DOM.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function escapeHtml(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // Run application boot sequence
    init();
});