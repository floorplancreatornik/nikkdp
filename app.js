let projects = JSON.parse(localStorage.getItem('kdp_projects')) || {};
let activeProjectId = localStorage.getItem('kdp_active_id') || null;
let book = projects[activeProjectId] || null;

// PROJECT MANAGEMENT
function createNewProject() {
    const id = 'p_' + Date.now();
    const title = prompt("Book Title:", "New Book");
    if (!title) return;
    projects[id] = {
        id,
        metadata: { title: title, author: '', copyrightYear: '2025', isbn: '' },
        cover: { backText: '', image: null },
        chapters: [{ id: 1, title: 'Chapter 1', html: '' }],
        activeId: 1,
        dedicationHtml: '',
        aboutAuthorHtml: ''
    };
    saveAndSwitch(id);
}

function saveAndSwitch(id) {
    activeProjectId = id;
    book = projects[id];
    localStorage.setItem('kdp_projects', JSON.stringify(projects));
    localStorage.setItem('kdp_active_id', id);
    renderProjectList();
    loadActiveProject();
}

function loadActiveProject() {
    if (!book) { showTab('projects'); return; }
    document.getElementById('active-project-name').innerText = book.metadata.title;
    document.getElementById('m-title').value = book.metadata.title;
    document.getElementById('m-author').value = book.metadata.author;
    document.getElementById('editor-dedication').innerHTML = book.dedicationHtml;
    sync();
    loadCh();
}

function renderProjectList() {
    const list = document.getElementById('project-list');
    list.innerHTML = '';
    Object.values(projects).forEach(p => {
        const card = document.createElement('div');
        card.className = `project-card ${p.id === activeProjectId ? 'active' : ''}`;
        card.innerHTML = `<strong>${p.metadata.title}</strong><br><small>${p.metadata.author || 'No Author'}</small>
                          <button class="del-btn" onclick="deleteProject('${p.id}', event)">X</button>`;
        card.onclick = () => saveAndSwitch(p.id);
        list.appendChild(card);
    });
}

function deleteProject(id, e) {
    e.stopPropagation();
    if (confirm("Delete this project?")) {
        delete projects[id];
        if (activeProjectId === id) activeProjectId = null;
        saveAndSwitch(Object.keys(projects)[0] || null);
    }
}

// IMPORT / EXPORT PROJECT FILE
function exportProjectFile() {
    const dataStr = JSON.stringify(book);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.metadata.title}.kdp`;
    a.click();
}

function importProject(input) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const imported = JSON.parse(e.target.result);
        projects[imported.id] = imported;
        saveAndSwitch(imported.id);
    };
    reader.readAsText(input.files[0]);
}

// EDITOR CORE
function showTab(n) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display='none');
    document.getElementById(`tab-${n}`).style.display='block';
    if(n === 'projects') renderProjectList();
}

function update(cat, f, v) {
    if(!book) return;
    if(cat) book[cat][f] = v; else book[f] = v;
    sync();
}

function sync() {
    if(!book) return;
    document.getElementById('ft-t').innerText = book.metadata.title;
    document.getElementById('ft-a').innerText = book.metadata.author;
    document.getElementById('sp-txt').innerText = book.metadata.title;
    if(book.cover.image) document.getElementById('cv-bg').style.backgroundImage = `url(${book.cover.image})`;
    localStorage.setItem('kdp_projects', JSON.stringify(projects));
    calcStats();
}

function loadCh() {
    const ch = book.chapters.find(x => x.id === book.activeId);
    document.getElementById('ch-title').value = ch.title;
    document.getElementById('main-editor').innerHTML = ch.html;
    renderChList();
}

function saveCh() {
    const ch = book.chapters.find(x => x.id === book.activeId);
    ch.title = document.getElementById('ch-title').value;
    ch.html = document.getElementById('main-editor').innerHTML;
    sync();
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
    saveCh(); book.activeId = id; loadCh();
}

function calcStats() {
    let total = 0;
    book.chapters.forEach(c => {
        const txt = c.html.replace(/<[^>]*>/g, ' ').trim();
        const count = txt ? txt.split(/\s+/).length : 0;
        total += count;
        if(c.id === book.activeId) document.getElementById('ch-count').innerText = count + ' words';
    });
    document.getElementById('total-words').innerText = total;
}

// EXPORTS
function exportPDF() {
    saveCh();
    const area = document.getElementById('print-area');
    area.innerHTML = '';
    area.innerHTML += `<div class="page"><h1>${book.metadata.title}</h1><p style="text-align:center">${book.metadata.author}</p></div>`;
    book.chapters.forEach(c => {
        area.innerHTML += `<div class="page"><h2>${c.title}</h2>${c.html}</div>`;
    });
    window.print();
}

async function exportEPUB() {
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip");
    const o = zip.folder("OEBPS");
    book.chapters.forEach((c, i) => o.file(`c${i}.xhtml`, `<html><body><h1>${c.title}</h1>${c.html}</body></html>`));
    const blob = await zip.generateAsync({type:"blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${book.metadata.title}.epub`;
    link.click();
}

function loadImg(i) {
    const r = new FileReader();
    r.onload = e => { update('cover','image',e.target.result); };
    r.readAsDataURL(i.files[0]);
}

function cmd(c, v=null) { document.execCommand(c, false, v); }

// INIT
if(activeProjectId) loadActiveProject(); else showTab('projects');
