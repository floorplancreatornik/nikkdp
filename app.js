let projects = JSON.parse(localStorage.getItem('kdp_final_v3')) || {};
let activeId = localStorage.getItem('kdp_active_id_v3') || null;
let book = projects[activeId] || null;

function showTab(n) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active-tab'));
    document.getElementById(`tab-${n}`).style.display = 'block';
    document.getElementById(`btn-tab-${n}`).classList.add('active-tab');
    if(n === 'projects') renderProjectList();
    if(n === 'details') renderKeywords();
    if(n === 'content') { loadCh(); initSort(); }
    if(n === 'export') renderPreview();
}

// OCR & IMAGE
async function runOCR(input) {
    const status = document.getElementById('ocr-status');
    status.innerText = "⌛ Scanning...";
    const { data: { text } } = await Tesseract.recognize(input.files[0], 'eng');
    document.getElementById('main-editor').innerHTML += `<p>${text}</p>`;
    status.innerText = "✅ Done";
    saveCh();
}

function insertImage(input) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = `<img src="${e.target.result}" style="max-width:100%; height:auto; margin: 10px 0;">`;
        document.execCommand('insertHTML', false, img);
        saveCh();
    };
    reader.readAsDataURL(input.files[0]);
}

// PROJECT LOGIC
function createNewProject() {
    const id = 'p_' + Date.now();
    projects[id] = {
        id, metadata: { title: "New Book", author: "", keywords: Array(7).fill("") },
        chapters: [{ id: 1, title: "Chapter 1", html: "" }], activeId: 1
    };
    activeId = id; book = projects[id];
    saveData(); showTab('details');
}

function deleteProject(id, e) {
    e.stopPropagation();
    if(confirm("Delete this book?")) {
        delete projects[id];
        if(activeId === id) activeId = null;
        saveData(); renderProjectList();
    }
}

function renderProjectList() {
    const list = document.getElementById('project-list');
    list.innerHTML = '';
    Object.values(projects).forEach(p => {
        const div = document.createElement('div');
        div.className = 'project-card';
        div.innerHTML = `<b>${p.metadata.title}</b><br><button onclick="deleteProject('${p.id}', event)">🗑 Delete</button>`;
        div.onclick = () => { activeId = p.id; book = projects[p.id]; showTab('details'); };
        list.appendChild(div);
    });
}

// CHAPTER LOGIC
function loadCh() {
    const ch = book.chapters.find(c => c.id == book.activeId);
    document.getElementById('ch-title').value = ch.title;
    document.getElementById('main-editor').innerHTML = ch.html;
    renderChList();
}

function saveCh() {
    const ch = book.chapters.find(c => c.id == book.activeId);
    ch.title = document.getElementById('ch-title').value;
    ch.html = document.getElementById('main-editor').innerHTML;
    saveData();
}

function renderChList() {
    const list = document.getElementById('ch-list');
    list.innerHTML = '';
    book.chapters.forEach(c => {
        const item = document.createElement('div');
        item.className = 'ch-item';
        item.innerText = c.title;
        item.onclick = () => { book.activeId = c.id; loadCh(); };
        list.appendChild(item);
    });
}

function addCh() {
    const id = Date.now();
    book.chapters.push({id, title: "New Chapter", html: ""});
    book.activeId = id; loadCh();
}

function generateTOC() {
    let toc = "<h2>Contents</h2><ul>";
    book.chapters.forEach(c => toc += `<li>${c.title}</li>`);
    toc += "</ul>";
    book.chapters.unshift({id: 0, title: "Table of Contents", html: toc});
    renderChList();
}

function renderPreview() {
    const area = document.getElementById('preview-area');
    area.innerHTML = '';
    book.chapters.forEach(c => {
        area.innerHTML += `<div class="print-page"><h3>${c.title}</h3>${c.html}</div>`;
    });
}

function saveData() { localStorage.setItem('kdp_final_v3', JSON.stringify(projects)); localStorage.setItem('kdp_active_id_v3', activeId); }
function update(cat, f, v) { if(cat) book[cat][f] = v; else book[f] = v; saveData(); }
function cmd(c, v=null) { document.execCommand(c, false, v); }

window.onload = () => { showTab('projects'); };
