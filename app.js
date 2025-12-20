let projects = JSON.parse(localStorage.getItem('kdp_final_v5')) || {};
let activeProjectId = localStorage.getItem('kdp_active_v5') || null;
let book = projects[activeProjectId] || null;

// THEME TOGGLE
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-mode');
    body.classList.toggle('light-mode', !isDark);
    localStorage.setItem('kdp_theme', isDark ? 'dark' : 'light');
}

// UI STATE OBSERVER (Selection Highlighting)
function updateUIHighlights() {
    // 1. Toolbar Highlighting
    const styles = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList'];
    styles.forEach(s => {
        const btn = document.getElementById('btn-' + s);
        if(btn) btn.classList.toggle('active', document.queryCommandState(s));
    });

    const block = document.queryCommandValue('formatBlock');
    const tags = ['h1', 'h2', 'p', 'blockquote'];
    tags.forEach(t => {
        const btn = document.getElementById('btn-' + t);
        if(btn) btn.classList.toggle('active', block === t || (t === 'p' && block === ''));
    });
}

document.addEventListener('selectionchange', updateUIHighlights);
document.addEventListener('keyup', updateUIHighlights);
document.addEventListener('mouseup', updateUIHighlights);

// NAVIGATION
function showTab(n) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active-tab'));
    
    document.getElementById(`tab-${n}`).style.display = 'block';
    document.getElementById(`btn-tab-${n}`).classList.add('active-tab');

    const tb = document.getElementById('global-toolbar');
    const editors = ['front', 'chapters', 'back'];
    tb.style.display = editors.includes(n) ? 'flex' : 'none';

    if (n === 'projects') renderProjectList();
    if (n === 'cover') calcSpine();
}

// PROJECT MANAGEMENT
function createNewProject() {
    const id = 'p_' + Date.now();
    const title = prompt("Book Title:");
    if (!title) return;
    projects[id] = {
        id, metadata: { title, author: '', copyrightYear: '2025', isbn: '', paperType: 'white' },
        chapters: [{ id: 1, title: 'Chapter 1', html: '' }],
        activeId: 1, dedicationHtml: '', aboutAuthorHtml: '', epilogueHtml: '', cover: { backText: '', image: null }
    };
    saveAndSwitch(id);
}

function saveAndSwitch(id) {
    activeProjectId = id;
    book = projects[id];
    localStorage.setItem('kdp_active_v5', id);
    saveData(); loadActiveProject(); showTab('front');
}

function renderProjectList() {
    const list = document.getElementById('project-list');
    list.innerHTML = '';
    Object.values(projects).forEach(p => {
        const card = document.createElement('div');
        card.className = `project-card ${p.id === activeProjectId ? 'active' : ''}`;
        card.innerHTML = `<strong>${p.metadata.title}</strong><br><small>${p.metadata.author || 'Author Name'}</small>`;
        card.onclick = () => saveAndSwitch(p.id);
        list.appendChild(card);
    });
}

// EDITOR LOGIC
function loadCh() {
    const ch = book.chapters.find(x => x.id === book.activeId);
    document.getElementById('ch-title').value = ch.title;
    document.getElementById('main-editor').innerHTML = ch.html;
    renderChList();
}

function saveCh() {
    if(!book) return;
    const ch = book.chapters.find(x => x.id === book.activeId);
    ch.title = document.getElementById('ch-title').value;
    ch.html = document.getElementById('main-editor').innerHTML;
    saveData();
    calcStats();
}

function renderChList() {
    const list = document.getElementById('ch-list');
    list.innerHTML = '';
    book.chapters.forEach(c => {
        const d = document.createElement('div');
        d.className = `ch-item ${c.id === book.activeId ? 'active' : ''}`;
        d.innerText = c.title;
        d.onclick = () => { saveCh(); book.activeId = c.id; loadCh(); };
        list.appendChild(d);
    });
}

function addCh() {
    const id = Date.now();
    book.chapters.push({id, title: 'New Chapter', html: ''});
    book.activeId = id; saveCh(); loadCh();
}

// SPINE & UTILS
function calcSpine() {
    let words = 0;
    book.chapters.forEach(c => words += c.html.replace(/<[^>]*>/g, '').split(/\s+/).filter(s => s.length > 0).length);
    const pages = Math.ceil(words / 300) + 10;
    const mult = (book.metadata.paperType === 'cream') ? 0.0025 : 0.00225;
    const width = Math.max(0.125, pages * mult);
    document.getElementById('spine-val').innerText = width.toFixed(3);
    document.getElementById('dynamic-spine').style.width = (width * 96) + "px";
}

function calcStats() {
    let total = 0;
    book.chapters.forEach(c => total += c.html.replace(/<[^>]*>/g, '').split(/\s+/).filter(s => s.length > 0).length);
    document.getElementById('ch-count').innerText = total + " words";
}

function saveData() { localStorage.setItem('kdp_final_v5', JSON.stringify(projects)); }
function cmd(c, v=null) { document.execCommand(c, false, v); updateUIHighlights(); }

function loadActiveProject() {
    if(!book) return;
    document.getElementById('m-title').value = book.metadata.title;
    document.getElementById('m-author').value = book.metadata.author;
    document.getElementById('m-year').value = book.metadata.copyrightYear;
    document.getElementById('m-isbn').value = book.metadata.isbn;
    document.getElementById('editor-dedication').innerHTML = book.dedicationHtml;
    document.getElementById('editor-author').innerHTML = book.aboutAuthorHtml;
    document.getElementById('editor-epilogue').innerHTML = book.epilogueHtml;
    document.getElementById('ft-t').innerText = book.metadata.title;
    document.getElementById('ft-a').innerText = book.metadata.author;
    loadCh();
}

function update(cat, f, v) { if(cat) book[cat][f] = v; else book[f] = v; saveData(); loadActiveProject(); }

// PRODUCTION
function exportPDF() {
    saveCh();
    const area = document.getElementById('print-area');
    area.innerHTML = '';
    area.innerHTML += `<div class="page centered-content"><h1>${book.metadata.title}</h1></div>`;
    area.innerHTML += `<div class="page centered-content"><h1>${book.metadata.title}</h1><h3>${book.metadata.author}</h3></div>`;
    area.innerHTML += `<div class="page" style="display:flex;align-items:flex-end;"><p>© ${book.metadata.copyrightYear} ${book.metadata.author}<br>ISBN: ${book.metadata.isbn}</p></div>`;
    if(book.dedicationHtml) area.innerHTML += `<div class="page centered-content"><i>${book.dedicationHtml}</i></div>`;
    book.chapters.forEach(c => area.innerHTML += `<div class="page"><h2>${c.title}</h2>${c.html}</div>`);
    if(book.epilogueHtml) area.innerHTML += `<div class="page"><h2>Epilogue</h2>${book.epilogueHtml}</div>`;
    area.innerHTML += `<div class="page"><h2>About the Author</h2>${book.aboutAuthorHtml}</div>`;
    window.print();
}

function exportProjectFile() {
    const blob = new Blob([JSON.stringify(book)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${book.metadata.title}.kdp`;
    a.click();
}

function importProject(input) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const p = JSON.parse(e.target.result);
        projects[p.id] = p; saveData(); renderProjectList();
    };
    reader.readAsText(input.files[0]);
}

function loadImg(i) {
    const r = new FileReader();
    r.onload = e => { update('cover','image',e.target.result); };
    r.readAsDataURL(i.files[0]);
}

// INITIALIZE
window.onload = () => {
    if(localStorage.getItem('kdp_theme') === 'dark') toggleTheme();
    if(activeProjectId && projects[activeProjectId]) { loadActiveProject(); showTab('projects'); }
    else { showTab('projects'); }
};
