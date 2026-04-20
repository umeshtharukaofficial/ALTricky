/**
 * StudyFlow - Application Logic
 */

// --- State Management ---
let state = {
    subjects: [],
    timetable: [],
    categories: ['Science', 'Mathematics', 'Language', 'Social Studies', 'Computer Science', 'Arts'],
    activeTab: 'dashboard',
    streak: [], // Last 30 days activity
    nextId: 1
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

function initApp() {
    // Load from LocalStorage
    const savedState = localStorage.getItem('studyflow_state');
    if (savedState) {
        state = JSON.parse(savedState);
    } else {
        // Initialize default streak data
        generateInitialStreak();
    }

    renderAll();
}

function saveState() {
    localStorage.setItem('studyflow_state', JSON.stringify(state));
    renderAll();
}

// --- Event Listeners ---
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Mobile Menu
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Modals
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    const quickAddBtn = document.getElementById('quickAddBtn');
    const closeSubjectModal = document.getElementById('closeSubjectModal');
    const cancelSubject = document.getElementById('cancelSubject');
    const subjectForm = document.getElementById('subjectForm');

    addSubjectBtn.addEventListener('click', () => openSubjectModal());
    quickAddBtn.addEventListener('click', () => openSubjectModal());
    closeSubjectModal.addEventListener('click', () => closeAllModals());
    cancelSubject.addEventListener('click', () => closeAllModals());
    
    subjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSubjectSubmit();
    });

    // Color Swatches
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            document.getElementById('subjectColor').value = swatch.dataset.color;
        });
    });

    // Timetable
    const addSessionBtn = document.getElementById('addSessionBtn');
    const closeSessionModal = document.getElementById('closeSessionModal');
    const cancelSession = document.getElementById('cancelSession');
    const sessionForm = document.getElementById('sessionForm');

    addSessionBtn.addEventListener('click', () => openSessionModal());
    closeSessionModal.addEventListener('click', () => closeAllModals());
    cancelSession.addEventListener('click', () => closeAllModals());
    
    sessionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSessionSubmit();
    });

    // Search and Filters
    document.getElementById('searchInput').addEventListener('input', renderSubjects);
    document.getElementById('categoryFilter').addEventListener('change', renderSubjects);
    document.getElementById('statusFilter').addEventListener('change', renderSubjects);
}

// --- Tab Navigation ---
function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Update Nav UI
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update Content UI
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.toggle('active', tab.id === `tab-${tabId}`);
    });

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
    
    renderAll();
}

// --- Subject Logic ---
function openSubjectModal(subject = null) {
    const modal = document.getElementById('subjectModal');
    const title = document.getElementById('subjectModalTitle');
    const form = document.getElementById('subjectForm');
    
    // Reset form
    form.reset();
    document.getElementById('subjectId').value = '';
    
    // Populate categories
    populateCategorySelects();

    if (subject) {
        title.innerText = 'Edit Subject';
        document.getElementById('subjectId').value = subject.id;
        document.getElementById('subjectName').value = subject.name;
        document.getElementById('subjectCategory').value = subject.category;
        document.getElementById('subjectPriority').value = subject.priority;
        document.getElementById('subjectExamDate').value = subject.examDate || '';
        document.getElementById('subjectChapters').value = subject.totalChapters || '';
        document.getElementById('subjectNotes').value = subject.notes || '';
        document.getElementById('subjectColor').value = subject.color;
        
        // Update color swatches
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.classList.toggle('active', swatch.dataset.color === subject.color);
        });
    } else {
        title.innerText = 'Add New Subject';
    }

    modal.classList.add('active');
}

function handleSubjectSubmit() {
    const id = document.getElementById('subjectId').value;
    const name = document.getElementById('subjectName').value;
    const category = document.getElementById('subjectCategory').value;
    const priority = document.getElementById('subjectPriority').value;
    const examDate = document.getElementById('subjectExamDate').value;
    const totalChapters = document.getElementById('subjectChapters').value;
    const notes = document.getElementById('subjectNotes').value;
    const color = document.getElementById('subjectColor').value;

    if (category === 'custom') {
        // Handle custom category logic if needed, simplify for now
        return;
    }

    const subjectData = {
        id: id ? parseInt(id) : state.nextId++,
        name,
        category,
        priority,
        examDate,
        totalChapters: totalChapters ? parseInt(totalChapters) : 1,
        completedChapters: id ? (state.subjects.find(s => s.id === parseInt(id))?.completedChapters || 0) : 0,
        notes,
        color,
        status: id ? (state.subjects.find(s => s.id === parseInt(id))?.status || 'pending') : 'pending',
        createdAt: id ? (state.subjects.find(s => s.id === parseInt(id))?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (id) {
        const index = state.subjects.findIndex(s => s.id === parseInt(id));
        state.subjects[index] = subjectData;
        showToast('Subject updated successfully!');
    } else {
        state.subjects.push(subjectData);
        showToast('Subject added successfully!');
    }

    closeAllModals();
    saveState();
}

function deleteSubject(id) {
    if (confirm('Are you sure you want to delete this subject? All associated sessions will be removed.')) {
        state.subjects = state.subjects.filter(s => s.id !== id);
        state.timetable = state.timetable.filter(t => t.subjectId !== id);
        saveState();
        showToast('Subject deleted', 'error');
    }
}

function updateSubjectProgress(id, count) {
    const subject = state.subjects.find(s => s.id === id);
    if (!subject) return;

    subject.completedChapters = Math.max(0, Math.min(subject.totalChapters, count));
    
    if (subject.completedChapters === 0) {
        subject.status = 'pending';
    } else if (subject.completedChapters === subject.totalChapters) {
        subject.status = 'completed';
        // Add streak activity
        recordActivity();
    } else {
        subject.status = 'in-progress';
    }

    saveState();
}

// --- Timetable Logic ---
function openSessionModal(session = null) {
    const modal = document.getElementById('sessionModal');
    const select = document.getElementById('sessionSubject');
    
    // Clear and populate subjects
    select.innerHTML = '<option value="">Select subject</option>';
    state.subjects.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.innerText = s.name;
        select.appendChild(option);
    });

    if (session) {
        // Edit mode (not fully implemented in HTML yet for simplicity, but logic here)
    }

    modal.classList.add('active');
}

function handleSessionSubmit() {
    const subjectId = parseInt(document.getElementById('sessionSubject').value);
    const day = document.getElementById('sessionDay').value;
    const timeSlot = document.getElementById('sessionTimeSlot').value;
    const topic = document.getElementById('sessionTopic').value;

    const subject = state.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const sessionData = {
        id: Date.now(),
        subjectId,
        subjectName: subject.name,
        color: subject.color,
        day,
        timeSlot,
        topic
    };

    state.timetable.push(sessionData);
    closeAllModals();
    saveState();
    showToast('Session added to timetable');
}

function deleteSession(id) {
    state.timetable = state.timetable.filter(s => s.id !== id);
    saveState();
    showToast('Session removed', 'error');
}

// --- General UI ---
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function updateDateTime() {
    const now = new Date();
    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    
    if (document.getElementById('currentDate')) {
        document.getElementById('currentDate').innerText = now.toLocaleDateString('en-US', dateOptions);
        document.getElementById('currentTime').innerText = now.toLocaleTimeString('en-US', timeOptions);
    }

    // Update greeting
    const hours = now.getHours();
    let greeting = 'Good evening';
    if (hours < 12) greeting = 'Good morning';
    else if (hours < 17) greeting = 'Good afternoon';
    
    if (document.getElementById('greetingText')) {
        document.getElementById('greetingText').innerText = `${greeting}! Here's your study overview.`;
        document.getElementById('todayDay').innerText = now.toLocaleDateString('en-US', { weekday: 'long' });
    }
}

// --- Rendering Functions ---
function renderAll() {
    renderDashboard();
    renderSubjects();
    renderTimetable();
    renderProgress();
    populateCategorySelects();
}

function renderDashboard() {
    if (state.activeTab !== 'dashboard') return;

    // Stats
    const total = state.subjects.length;
    const completed = state.subjects.filter(s => s.status === 'completed').length;
    const pending = total - completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('statTotal').innerText = total;
    document.getElementById('statCompleted').innerText = completed;
    document.getElementById('statPending').innerText = pending;
    document.getElementById('statProgress').innerText = `${progress}%`;

    // Today's schedule
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todaySessions = state.timetable.filter(s => s.day === today);
    const scheduleList = document.getElementById('todayScheduleList');

    if (todaySessions.length > 0) {
        scheduleList.innerHTML = '';
        // Sort sessions by time approx
        todaySessions.sort((a,b) => a.timeSlot.localeCompare(b.timeSlot));
        
        todaySessions.forEach(session => {
            const div = document.createElement('div');
            div.className = 'session-list-item';
            div.style.borderLeft = `4px solid ${session.color}`;
            div.innerHTML = `
                <div class="session-info">
                    <div class="session-time">${session.timeSlot}</div>
                    <div class="session-subject-name">${session.subjectName}</div>
                    ${session.topic ? `<div class="session-topic">${session.topic}</div>` : ''}
                </div>
            `;
            scheduleList.appendChild(div);
        });
    }

    // Category breakdown
    const catContainer = document.getElementById('categoryOverview');
    if (total > 0) {
        catContainer.innerHTML = '';
        const cats = {};
        state.subjects.forEach(s => { cats[s.category] = (cats[s.category] || 0) + 1; });
        
        Object.entries(cats).forEach(([cat, count]) => {
            const perc = Math.round((count / total) * 100);
            const div = document.createElement('div');
            div.className = 'category-stat';
            div.innerHTML = `
                <div class="category-info">
                    <span>${cat}</span>
                    <span>${count} Subjects</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${perc}%; background: var(--primary)"></div>
                </div>
            `;
            catContainer.appendChild(div);
        });
    }

    // Upcoming Exams
    const examList = document.getElementById('upcomingExamsList');
    const exams = state.subjects.filter(s => s.examDate).sort((a,b) => new Date(a.examDate) - new Date(b.examDate));
    
    if (exams.length > 0) {
        examList.innerHTML = '';
        exams.forEach(s => {
            const date = new Date(s.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const div = document.createElement('div');
            div.className = 'exam-item';
            div.innerHTML = `
                <div class="exam-date-box">
                    <span class="exam-date-val">${new Date(s.examDate).getDate()}</span>
                    <span class="exam-month-val">${new Date(s.examDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div class="exam-meta">
                    <div class="exam-subject">${s.name}</div>
                    <div class="exam-full-date">${date}</div>
                </div>
                <div class="exam-status ${s.status}">${s.status}</div>
            `;
            examList.appendChild(div);
        });
    }
}

function renderSubjects() {
    if (state.activeTab !== 'subjects') return;

    const list = document.getElementById('subjectsList');
    const search = document.getElementById('searchInput').value.toLowerCase();
    const catFilter = document.getElementById('categoryFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    let filtered = state.subjects.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search);
        const matchesCat = catFilter === 'all' || s.category === catFilter;
        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        return matchesSearch && matchesCat && matchesStatus;
    });

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state large">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <h3>No matching subjects</h3>
                <p>Try adjusting your filters or search term</p>
            </div>
        `;
        return;
    }

    list.innerHTML = '';
    filtered.forEach(s => {
        const perc = Math.round((s.completedChapters / s.totalChapters) * 100);
        const card = document.createElement('div');
        card.className = 'subject-card';
        card.innerHTML = `
            <div class="subject-tag" style="background: ${s.color}"></div>
            <div class="subject-header">
                <div>
                    <h3 class="subject-name">${s.name}</h3>
                    <span class="subject-cat">${s.category}</span>
                </div>
                <span class="badge ${s.priority}">${s.priority}</span>
            </div>
            <div class="subject-meta">
                <div class="meta-item">
                    <span class="meta-label">Exam Date</span>
                    <span class="meta-value">${s.examDate ? new Date(s.examDate).toLocaleDateString() : 'Not Set'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Chapters</span>
                    <span class="meta-value">${s.completedChapters} / ${s.totalChapters}</span>
                </div>
            </div>
            <div class="subject-progress-container">
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${perc}%; background: ${s.color}"></div>
                </div>
                <div class="progress-text" style="color: ${s.color}">
                    <span>${s.status}</span>
                    <span>${perc}%</span>
                </div>
            </div>
            <div class="subject-actions">
                <button class="action-btn" onclick="openSubjectModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="action-btn" onclick="adjustChapters(${s.id}, 1)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <button class="action-btn" onclick="adjustChapters(${s.id}, -1)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <button class="action-btn delete" onclick="deleteSubject(${s.id})">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        `;
        list.appendChild(card);
    });
}

function adjustChapters(id, delta) {
    const s = state.subjects.find(sub => sub.id === id);
    if (s) {
        updateSubjectProgress(id, s.completedChapters + delta);
    }
}

function renderTimetable() {
    if (state.activeTab !== 'timetable') return;

    const grid = document.getElementById('timetableGrid');
    grid.innerHTML = '';

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timeSlots = [
        "06:00 - 07:00", "07:00 - 08:00", "08:00 - 09:00", "09:00 - 10:00",
        "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00",
        "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00",
        "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00"
    ];

    // Headers
    grid.appendChild(createCell('', 'grid-header'));
    days.forEach(day => {
        const cell = createCell('', 'grid-header');
        cell.innerHTML = `
            <span class="day-name">${day}</span>
            <span class="day-short">${day.substring(0,3)}</span>
        `;
        grid.appendChild(cell);
    });

    // Time rows
    timeSlots.forEach(slot => {
        grid.appendChild(createCell(slot, 'time-label'));
        days.forEach(day => {
            const cell = createCell('', 'grid-cell');
            const session = state.timetable.find(s => s.day === day && s.timeSlot === slot);
            
            if (session) {
                const block = document.createElement('div');
                block.className = 'session-block';
                block.style.background = `${session.color}20`; // 20% opacity
                block.style.borderLeftColor = session.color;
                block.style.color = session.color;
                block.innerHTML = `
                    <span class="session-name">${session.subjectName}</span>
                    <span class="session-topic">${session.topic || ''}</span>
                    <button class="delete-session" onclick="deleteSession(${session.id})">×</button>
                `;
                cell.appendChild(block);
            }
            grid.appendChild(cell);
        });
    });
}

function createCell(text, className) {
    const div = document.createElement('div');
    div.className = className;
    div.innerText = text;
    return div;
}

function renderProgress() {
    if (state.activeTab !== 'progress') return;

    // Progress Ring
    const totalChapters = state.subjects.reduce((sum, s) => sum + s.totalChapters, 0);
    const completedChapters = state.subjects.reduce((sum, s) => sum + s.completedChapters, 0);
    const perc = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
    
    const ring = document.getElementById('progressRingFill');
    const ringVal = document.getElementById('progressRingValue');
    const radius = 85;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (perc / 100) * circumference;
    
    ring.style.strokeDashoffset = offset;
    ringVal.innerText = `${perc}%`;

    // Breakdown
    const breakdown = document.getElementById('progressBreakdown');
    if (state.subjects.length > 0) {
        breakdown.innerHTML = '';
        state.subjects.forEach(s => {
            const sPerc = Math.round((s.completedChapters / s.totalChapters) * 100);
            const div = document.createElement('div');
            div.className = 'breakdown-item';
            div.innerHTML = `
                <div class="div-flex">
                    <span>${s.name}</span>
                    <span>${s.completedChapters}/${s.totalChapters} (${sPerc}%)</span>
                </div>
                <div class="progress-bar-bg small">
                    <div class="progress-bar-fill" style="width: ${sPerc}%; background: ${s.color}"></div>
                </div>
            `;
            breakdown.appendChild(div);
        });
    }

    // Streak Grid
    renderStreak();
}

function renderStreak() {
    const grid = document.getElementById('streakGrid');
    grid.innerHTML = '';
    state.streak.forEach(day => {
        const box = document.createElement('div');
        box.className = `streak-box level-${day.level}`;
        box.title = `${day.date}: ${day.count} activities`;
        grid.appendChild(box);
    });
}

function generateInitialStreak() {
    const streak = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        streak.push({
            date: d.toISOString().split('T')[0],
            count: 0,
            level: 0
        });
    }
    state.streak = streak;
}

function recordActivity() {
    const today = new Date().toISOString().split('T')[0];
    const day = state.streak.find(d => d.date === today);
    if (day) {
        day.count++;
        day.level = Math.min(4, Math.ceil(day.count / 2));
    }
}

function populateCategorySelects() {
    const selects = [
        document.getElementById('subjectCategory'),
        document.getElementById('categoryFilter')
    ];

    selects.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        const isFilter = select.id === 'categoryFilter';
        
        select.innerHTML = isFilter ? '<option value="all">All Categories</option>' : '<option value="">Select category</option>';
        
        state.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.innerText = cat;
            select.appendChild(opt);
        });

        if (!isFilter) {
            const customOpt = document.createElement('option');
            customOpt.value = 'custom';
            customOpt.innerText = '+ Add Custom';
            select.appendChild(customOpt);
        }

        select.value = currentVal || (isFilter ? 'all' : '');
    });
}
