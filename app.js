let projects = JSON.parse(localStorage.getItem('kdp_final')) || {};
let activeProjectId = localStorage.getItem('kdp_active') || null;
let book = projects[activeProjectId] || null;

// GLOBAL SELECTION OBSERVER
function checkFormat() {
    const btns = ['bold','italic','underline','strikeThrough','insertUnorderedList'];
    btns.forEach(id => {
        const btn = document.getElementById('btn-' + id);
        if(btn) btn.classList.toggle('active', document.queryCommandState(id));
    });
}
document.addEventListener('selectionchange', checkFormat);

// SPINE CALCULATION
function calcSpine() {
    if(!book) return;
    let words = 0;
    book.chapters.forEach(c => words += c.html.replace(/<[^>]*>/g, '').split(/\s+/).length);
    const pages = Math.ceil(words / 300) + 10; // +10 for front/back matter
    const mult = (book.metadata.paperType === 'cream') ? 0.0025 : 0.00225;
    const width = Math.max(0.0625, pages * mult);
    
    document.getElementById('spine-val').innerText = width.toFixed(3);
    document.getElementById('dynamic-spine').style.width = (width * 96) + "px";
}

// EXPORT PDF IN CHRONOLOGICAL ORDER
function exportPDF() {
    const area = document.getElementById('print-area');
    area.innerHTML = '';
    
    // 1. Half Title
    area.innerHTML += `<div class="page centered-content"><h1>${book.metadata.title}</h1></div>`;
    // 2. Title Page
    area.innerHTML += `<div class="page centered-content"><h1>${book.metadata.title}</h1><p>by</p><h3>${book.metadata.author}</h3></div>`;
    // 3. Copyright
    area.innerHTML += `<div class="page" style="display:flex; align-items:flex-end;"><p>© ${book.metadata.copyrightYear} ${book.metadata.author}<br>ISBN: ${book.metadata.isbn}</p></div>`;
    // 4. Dedication
    if(book.dedicationHtml) area.innerHTML += `<div class="page centered-content"><i>${book.dedicationHtml}</i></div>`;
    // 5. Chapters
    book.chapters.forEach(c => area.innerHTML += `<div class="page"><h2>${c.title}</h2>${c.html}</div>`);
    // 6. Back Matter
    if(book.epilogueHtml) area.innerHTML += `<div class="page"><h2>Afterword</h2>${book.epilogueHtml}</div>`;
    area.innerHTML += `<div class="page"><h2>About the Author</h2>${book.aboutAuthorHtml}</div>`;
    
    window.print();
}

// CORE HELPERS
function showTab(n) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display='none');
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active-tab'));
    document.getElementById(`tab-${n}`).style.display='block';
    document.getElementById(`btn-tab-${n}`).classList.add('active-tab');
    if(n==='cover') calcSpine();
}

function update(cat, f, v) { 
    if(cat) book[cat][f] = v; else book[f] = v; 
    save(); sync(); 
}

function saveCh() {
    const ch = book.chapters.find(x => x.id === book.activeId);
    ch.title = document.getElementById('ch-title').value;
    ch.html = document.getElementById('main-editor').innerHTML;
    save();
}

function save() { localStorage.setItem('kdp_final', JSON.stringify(projects)); }

function cmd(c,v=null) { document.execCommand(c, false, v); }

// Initialize
if(!activeProjectId) {
    const id = 'p1';
    projects[id] = { id, metadata: {title: 'New Book', paperType: 'white'}, chapters: [{id: 1, title: 'Chapter 1', html:''}], activeId: 1 };
    saveAndSwitch(id);
} else { loadActiveProject(); }
