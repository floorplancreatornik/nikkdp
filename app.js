let projects = JSON.parse(localStorage.getItem('kdp_omniscient_v1')) || {};
let activeProjectId = localStorage.getItem('kdp_active_omniscient_v1') || null;
let book = projects[activeProjectId] || null;

// --- INITIALIZATION & CORE UTILS ---
function saveData() { localStorage.setItem('kdp_omniscient_v1', JSON.stringify(projects)); }
function cmd(c, v=null) { document.execCommand(c, false, v); updateUIHighlights(); }
function update(cat, f, v) { if(cat) book[cat][f] = v; else book[f] = v; saveData(); loadActiveProject(); }

// --- THEME TOGGLE ---
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('kdp_theme', isDark ? 'dark' : 'light');
}

// --- UI HIGHLIGHTING (Toolbar, Tabs, Chapters) ---
function updateUIHighlights() {
    const styles = ['bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter', 'justifyRight', 'insertUnorderedList'];
    styles.forEach(s => {
        const btn = document.querySelector(`button[onclick="cmd('${s}')"]`);
        if(btn) btn.classList.toggle('active', document.queryCommandState(s));
    });
    const block = document.queryCommandValue('formatBlock');
    ['h1', 'p'].forEach(t => {
        const btn = document.querySelector(`button[onclick="cmd('formatBlock','${t.toUpperCase()}')"]`);
        if(btn) btn.classList.toggle('active', block === t || (t === 'p' && block === ''));
    });
}
document.addEventListener('selectionchange', updateUIHighlights);
document.addEventListener('keyup', updateUIHighlights);
document.addEventListener('mouseup', updateUIHighlights);


// --- TAB NAVIGATION ---
function showTab(n) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active-tab'));
    
    document.getElementById(`tab-${n}`).style.display = 'block';
    document.getElementById(`btn-tab-${n}`).classList.add('active-tab');

    // LTR Direction Reset for all editors
    document.querySelectorAll('.editor, .editor-mini').forEach(ed => {
        ed.style.direction = 'ltr';
        ed.style.unicodeBidi = 'isolate';
    });

    const toolbar = document.getElementById('global-toolbar');
    toolbar.style.display = (n === 'content') ? 'flex' : 'none';

    if (n === 'projects') renderProjectList();
    if (n === 'details') renderKeywordsAndCategories();
    if (n === 'cover') calcSpine();
    if (n === 'rights') calcRoyalty();
    if (n === 'content') { loadCh(); initializeSortable(); }
}

// --- PROJECT MANAGEMENT (Library) ---
function createNewProject() {
    const id = 'p_' + Date.now();
    const title = prompt("Enter Book Title:") || "Untitled Book";
    projects[id] = {
        id, metadata: { title, subtitle: '', author: '', series: '', edition: '', publisher: '',
                       keywords: Array(7).fill(''), categories: [''], price: 9.99, paperType: 'white',
                       worldwideRights: true, expandedDistribution: false, adultContent: false, lowContent: false, hasBleed: false },
        chapters: [{ id: Date.now(), title: 'Introduction', html: '<p>Start writing your book here...</p>' }],
        activeId: null, // Will be set to the first chapter in loadActiveProject
        descriptionHtml: '', dedicationHtml: '', cover: { imageData: null, backText: '' }
    };
    saveAndSwitch(id);
}

function saveAndSwitch(id) {
    activeProjectId = id; book = projects[id];
    localStorage.setItem('kdp_active_omniscient_v1', id);
    saveData(); 
    loadActiveProject();
    if (!book.activeId && book.chapters.length > 0) { // Set first chapter as active on new project
        book.activeId = book.chapters[0].id;
        saveData();
        loadCh();
    }
    showTab('details');
}

function deleteProject(id, event) {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${projects[id].metadata.title}"? This cannot be undone.`)) {
        delete projects[id];
        if (activeProjectId === id) { activeProjectId = null; book = null; }
        saveData();
        renderProjectList();
        if (!activeProjectId) showTab('projects'); // Go back to projects if current one deleted
    }
}

function renderProjectList() {
    const list = document.getElementById('project-list');
    list.innerHTML = '';
    Object.values(projects).forEach(p => {
        const card = document.createElement('div');
        card.className = `project-card ${p.id === activeProjectId ? 'active' : ''}`;
        card.innerHTML = `
            <strong>${p.metadata.title}</strong><br>
            <small>${p.metadata.author || 'No Author'}</small><br>
            <button class="card-del-btn" onclick="deleteProject('${p.id}', event)">🗑️ Delete</button>
        `;
        card.onclick = () => saveAndSwitch(p.id);
        list.appendChild(card);
    });
}

// --- KDP DETAILS (Page 1) ---
function renderKeywordsAndCategories() {
    const kwContainer = document.getElementById('keyword-container');
    kwContainer.innerHTML = '';
    if (!book.metadata.keywords) book.metadata.keywords = Array(7).fill('');
    book.metadata.keywords.forEach((kw, i) => {
        const inp = document.createElement('input');
        inp.placeholder = `Keyword ${i + 1}`;
        inp.value = kw;
        inp.oninput = (e) => { book.metadata.keywords[i] = e.target.value; saveData(); };
        kwContainer.appendChild(inp);
    });

    const catContainer = document.getElementById('category-container');
    catContainer.innerHTML = '';
    if (!book.metadata.categories || book.metadata.categories.length === 0) book.metadata.categories = [''];
    book.metadata.categories.forEach((cat, i) => {
        const select = document.createElement('select');
        select.innerHTML = `
            <option value="">Select Category</option>
            <option value="Fiction">Fiction</option>
            <option value="Non-Fiction">Non-Fiction</option>
            <option value="Fantasy">Fantasy</option>
            <option value="Sci-Fi">Sci-Fi</option>
            <option value="Thriller">Thriller</option>
            <option value="Romance">Romance</option>
            <option value="Biography">Biography</option>
            <option value="History">History</option>
            <option value="Self-Help">Self-Help</option>
            <option value="Cooking">Cooking</option>
            <option value="Education">Education</option>
        `; // Add more as needed
        select.value = cat;
        select.onchange = (e) => { book.metadata.categories[i] = e.target.value; saveData(); };
        catContainer.appendChild(select);
    });
}

function addCategory() {
    if (book.metadata.categories.length < 3) { // KDP allows up to 3 categories
        book.metadata.categories.push('');
        renderKeywordsAndCategories();
        saveData();
    } else {
        alert("Amazon KDP typically allows up to 3 categories.");
    }
}

// --- MANUSCRIPT CONTENT (Page 2) ---
function loadCh() {
    const ch = book.chapters.find(x => x.id === book.activeId);
    if (ch) {
        document.getElementById('ch-title').value = ch.title;
        document.getElementById('main-editor').innerHTML = ch.html;
    } else { // Handle no active chapter or new project with no chapters
        document.getElementById('ch-title').value = '';
        document.getElementById('main-editor').innerHTML = '';
    }
    renderChList();
}

function saveCh() {
    if (!book || !book.activeId) return;
    const ch = book.chapters.find(x => x.id === book.activeId);
    if (ch) {
        ch.title = document.getElementById('ch-title').value;
        ch.html = document.getElementById('main-editor').innerHTML;
        saveData();
        renderChList(); // Update list after title change
    }
}

function renderChList() {
    const list = document.getElementById('ch-list');
    list.innerHTML = '';
    book.chapters.forEach(c => {
        const d = document.createElement('div');
        d.className = `ch-item ${c.id === book.activeId ? 'active' : ''}`;
        d.innerText = c.title || `Chapter ${book.chapters.indexOf(c) + 1}`;
        d.dataset.id = c.id; // For Sortable.js
        d.onclick = () => { saveCh(); book.activeId = c.id; loadCh(); };
        list.appendChild(d);
    });
}

function addCh() {
    const id = Date.now();
    const newChapter = { id, title: `New Chapter ${book.chapters.length + 1}`, html: '<p>Start typing your new chapter here.</p>' };
    book.chapters.push(newChapter);
    book.activeId = id; saveData(); loadCh();
}

// --- Sortable.js for Chapter Reordering ---
function initializeSortable() {
    const chapterList = document.getElementById('ch-list');
    Sortable.create(chapterList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function (evt) {
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;
            const [movedChapter] = book.chapters.splice(oldIndex, 1);
            book.chapters.splice(newIndex, 0, movedChapter);
            saveData();
            renderChList(); // Re-render to update order visually
        },
    });
}

// --- OCR (Image-to-Text) ---
async function runOCR(input) {
    const status = document.getElementById('ocr-status');
    status.innerText = "⏳ Reading image...";
    const { data: { text } } = await Tesseract.recognize(input.files[0], 'eng');
    document.getElementById('main-editor').innerHTML += `<p>${text}</p>`;
    status.innerText = "✅ Scan Complete";
    saveCh();
}

// --- Image Insertion ---
function insertImage(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        document.execCommand('insertHTML', false, `<img src="${imageUrl}" style="max-width:100%; height:auto; display:block; margin:1em auto;">`);
        saveCh();
    };
    reader.readAsDataURL(file);
}

// --- Automatic Table of Contents ---
function generateTOC() {
    if (!book || book.chapters.length === 0) {
        alert("Add some chapters first!");
        return;
    }

    let tocHtml = '<h2>Table of Contents</h2><ul>';
    book.chapters.forEach((chapter, index) => {
        tocHtml += `<li><a href="#chapter-${chapter.id}">${chapter.title || `Chapter ${index + 1}`}</a></li>`;
    });
    tocHtml += '</ul>';

    // Find or create the TOC chapter
    let tocChapter = book.chapters.find(ch => ch.title === "Table of Contents");
    if (tocChapter) {
        tocChapter.html = tocHtml;
    } else {
        const tocId = Date.now();
        tocChapter = { id: tocId, title: "Table of Contents", html: tocHtml };
        book.chapters.unshift(tocChapter); // Add to the beginning
    }
    book.activeId = tocChapter.id;
    saveData();
    loadCh();
    alert("Table of Contents Generated/Updated!");
}

// --- COVER & SPINE (KDP Page 3) ---
function calcSpine() {
    let wordCount = 0;
    book.chapters.forEach(c => wordCount += c.html.replace(/<[^>]*>/g, '').length / 5); // Rough word count
    const pages = Math.
