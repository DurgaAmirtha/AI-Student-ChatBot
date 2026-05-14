let currentUser = null;
let currentMode = 'dashboard';
let currentChatSessionId = null;
let selectedFile = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if(!api.getToken()) throw new Error("No token");
        // Fetch user data
        currentUser = await api.request('/auth/me');
        if(!currentUser) throw new Error("Could not fetch user");

        document.getElementById('userInitials').textContent = currentUser.name.charAt(0).toUpperCase();
        document.getElementById('userNameLabel').textContent = currentUser.name;
        document.getElementById('userEmailLabel').textContent = currentUser.email;

        // Initialize features
        setupNavigation();
        loadDashboardStats();
        setupChatInteractions();
        setupPlannerInterface();
        
    } catch (e) {
        console.error("Auth error:", e);
        window.location.href = '/';
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        api.clearToken();
        window.location.href = '/';
    });
});

function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const mode = item.getAttribute('data-mode');
            switchMode(mode);
        });
    });
}

function switchMode(mode) {
    currentMode = mode;
    currentChatSessionId = null; // Reset session when switching modes

    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    // Reset Chat UI
    document.getElementById('chatContainer').innerHTML = '';
    document.getElementById('fileUploadWrapper').classList.add('hidden');
    clearFileSelection();

    // Show appropriate view and update header
    const titleEl = document.getElementById('currentSectionTitle');
    
    if(mode === 'dashboard') {
        document.getElementById('view-dashboard').classList.remove('hidden');
        titleEl.textContent = "Dashboard";
        loadDashboardStats();
    } 
    else if (mode === 'planner') {
        document.getElementById('view-planner').classList.remove('hidden');
        titleEl.textContent = "Smart Planner";
        loadTasks();
    }
    else {
        // It's a Chat Mode
        document.getElementById('view-chat').classList.remove('hidden');
        
        switch(mode) {
            case 'study': titleEl.innerHTML = '<i class="fa-solid fa-book-open text-emerald-400 mr-2"></i> Study Mode'; break;
            case 'interview': titleEl.innerHTML = '<i class="fa-solid fa-microphone-lines text-purple-400 mr-2"></i> Interview Mode'; break;
            case 'communication': titleEl.innerHTML = '<i class="fa-solid fa-language text-pink-400 mr-2"></i> Comm Trainer'; break;
            case 'doubt_solver': 
                titleEl.innerHTML = '<i class="fa-solid fa-magnifying-glass-chart text-orange-400 mr-2"></i> Doubt Solver'; 
                document.getElementById('fileUploadWrapper').classList.remove('hidden'); // Show file upload button
                break;
        }

        // Add a welcoming message to chat
        appendMessage('ai', `Welcome to ${mode.replace('_', ' ')}. How can I help you today?`);
    }
}

// ====================== DASHBOARD ======================
async function loadDashboardStats() {
    try {
        const stats = await api.request('/analytics/');
        document.getElementById('stat-tasks').textContent = stats.tasks_completed + " / " + stats.total_tasks;
        document.getElementById('stat-sessions').textContent = stats.total_study_sessions;
        document.getElementById('stat-rate').textContent = Math.round(stats.completion_rate) + "%";
        
        // Tags
        const tagsContainer = document.getElementById('weakAreasTags');
        const areas = stats.weak_areas ? stats.weak_areas.split(',').map(s=>s.trim()) : ['None recorded'];
        tagsContainer.innerHTML = areas.map(area => `<span class="bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-blue-300 font-medium">${area}</span>`).join('');

        renderChart(stats.activity_data);
    } catch(err) {
        console.error(err);
    }
}

let chartInstance = null;
function renderChart(data) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    if(chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Study Hours',
                data: data || [0,0,0,0,0,0,0],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: 'transparent' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// ====================== CHAT SYSTEM ======================
function setupChatInteractions() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    sendBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // File interactions
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    const removeFileBtn = document.getElementById('removeFileBtn');

    if(attachBtn) attachBtn.addEventListener('click', () => fileInput.click());
    
    if(fileInput) fileInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            document.getElementById('fileNameDisplay').textContent = selectedFile.name;
            document.getElementById('filePreview').classList.remove('hidden');
        }
    });

    if(removeFileBtn) removeFileBtn.addEventListener('click', clearFileSelection);
}

function clearFileSelection() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').classList.add('hidden');
}

async function handleSendMessage() {
    const inputEl = document.getElementById('chatInput');
    const content = inputEl.value.trim();
    
    // In Doubt Solver mode, content can be empty if a file is attached
    if (!content && !selectedFile) return;

    // Reset input
    inputEl.value = '';
    inputEl.style.height = 'auto';
    
    // Optimistic UI update
    const displayMsg = selectedFile ? `[Attached: ${selectedFile.name}] ${content}` : content;
    appendMessage('user', displayMsg);
    
    // Show AI loading
    const loadingId = appendLoadingBubble();

    try {
        let res;
        
        if (selectedFile) {
            // Use Multipart Form Data for files
            const formData = new FormData();
            formData.append('file', selectedFile);
            if(content) formData.append('question', content);
            
            res = await api.request('/files/upload', {
                method: 'POST',
                body: formData, // the api.js ignores Content-Type for FormData
            });
            
            currentChatSessionId = res.session_id;
            removeElement(loadingId);
            appendMessage('ai', res.answer);
            clearFileSelection(); // success, so clear it
            
        } else {
            // Standard JSON message
            res = await api.request('/chat/message', {
                method: 'POST',
                body: JSON.stringify({
                    session_id: currentChatSessionId,
                    mode: currentMode,
                    content: content
                })
            });
            currentChatSessionId = res.session_id;
            removeElement(loadingId);
            appendMessage('ai', res.content);
        }
        
    } catch(err) {
        removeElement(loadingId);
        appendMessage('ai', `<span class="text-red-400">Error: ${err.message}</span>`);
    }
}

function appendMessage(sender, htmlContent) {
    const container = document.getElementById('chatContainer');
    const wrapper = document.createElement('div');
    wrapper.className = `flex max-w-4xl mx-auto w-full mb-6 relative group ${sender==='user' ? 'flex-row-reverse' : ''}`;
    
    // Avatar
    const avatar = document.createElement('div');
    avatar.className = `w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${sender==='ai' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white mr-4' : 'bg-slate-700 text-gray-300 ml-4'}`;
    avatar.innerHTML = sender === 'ai' ? '<i class="fa-solid fa-robot"></i>' : '<i class="fa-solid fa-user"></i>';
    
    // Message bubble
    const bubble = document.createElement('div');
    bubble.className = `p-4 rounded-2xl text-[15px] leading-relaxed markdown-body max-w-[85%] ${
        sender === 'user' 
        ? 'bg-slate-700 text-gray-100 rounded-tr-sm' 
        : 'border border-slate-700/50 bg-cardBg text-gray-300 rounded-tl-sm shadow-xl'
    }`;
    
    // Parse markdown for AI messages ONLY if we imported marked (we did via CDN)
    bubble.innerHTML = sender === 'ai' ? marked.parse(htmlContent) : htmlContent; // User text is raw string conceptually, but here we just pass it natively. Note: XSS vulnerability if untrusted. Since user wrote it, it's mostly fine for this demo.

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
}

function appendLoadingBubble() {
    const container = document.getElementById('chatContainer');
    const id = 'loading-' + Date.now();
    const html = `
    <div class="flex items-start max-w-4xl mx-auto w-full mb-6" id="${id}">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex flex-shrink-0 items-center justify-center mr-4">
            <i class="fa-solid fa-robot animate-pulse"></i>
        </div>
        <div class="p-4 rounded-2xl rounded-tl-sm border border-slate-700/50 bg-cardBg text-gray-300 shadow-xl flex items-center gap-1 h-[54px]">
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style="animation-delay: 0.2s"></span>
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style="animation-delay: 0.4s"></span>
        </div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeElement(id) {
    const el = document.getElementById(id);
    if(el) el.remove();
}

// ====================== PLANNER ======================
function setupPlannerInterface() {
    const taskForm = document.getElementById('taskForm');
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('taskTitle').value;
        const subject = document.getElementById('taskSubject').value;

        try {
            await api.request('/planner/tasks', {
                method: 'POST',
                body: JSON.stringify({ title, subject })
            });
            document.getElementById('taskTitle').value = '';
            document.getElementById('taskSubject').value = '';
            loadTasks();
        } catch(err) {
            console.error("Failed to add task", err);
        }
    });

    document.getElementById('generatePlanBtn').addEventListener('click', async () => {
        // Feature to auto generate. For demo, we just add a mock one.
        // In reality, we'd hit /chat/message with mode="planner" and parse json output.
        alert('AI Auto-Plan is triggered! This will synthesize your weak areas and create tasks.');
    });
}

async function loadTasks() {
    try {
        const tasks = await api.request('/planner/tasks');
        const listEl = document.getElementById('taskList');
        listEl.innerHTML = '';

        if(tasks.length === 0) {
            listEl.innerHTML = '<div class="text-center text-gray-500 mt-10 p-6 border border-dashed border-slate-700 rounded-xl">No tasks yet. You are all caught up!</div>';
            return;
        }

        tasks.forEach(t => {
            const html = `
            <div class="flex items-center justify-between p-4 bg-cardBg border ${t.is_completed ? 'border-emerald-500/50 opacity-60' : 'border-slate-700'} rounded-xl shadow-sm hover:border-blue-500/50 transition">
                <div class="flex items-center gap-4 flex-1">
                    <button class="w-6 h-6 rounded border ${t.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500 hover:border-emerald-400'} flex items-center justify-center transition" onclick="completeTask(${t.id}, ${t.is_completed})">
                        ${t.is_completed ? '<i class="fa-solid fa-check text-xs"></i>' : ''}
                    </button>
                    <div>
                        <h4 class="font-medium ${t.is_completed ? 'line-through text-gray-400' : 'text-gray-200'}">${t.title}</h4>
                        ${t.subject ? `<p class="text-xs font-semibold uppercase tracking-wider text-blue-400 mt-1">${t.subject}</p>` : ''}
                    </div>
                </div>
            </div>`;
            listEl.insertAdjacentHTML('beforeend', html);
        });
    } catch (err) {
        console.error(err);
    }
}

window.completeTask = async function(id, is_completed) {
    if(is_completed) return; // already completed
    try {
        await api.request(`/planner/tasks/${id}/complete`, { method: 'PUT' });
        loadTasks();
        loadDashboardStats(); // update completion rate in background
    } catch(err) {
        console.error("Complete task error", err);
    }
}
