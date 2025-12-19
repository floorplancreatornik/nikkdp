let book = JSON.parse(localStorage.getItem('kdp_ultimate_data')) || {
    metadata: { title: 'Untitled Book', subtitle: '', author: 'Author Name', copyrightYear: '2025', isbn: '' },
    cover: { backText: '', image: null },
    dedicationHtml: '',
    aboutAuthorHtml: '',
    chapters: [{ id: 1, title: 'Chapter One', html: '<p>Start writing...</p>' }],
    activeId: 1
};

function showTab(t) {
    document.querySelectorAll('.tab-content').forEach(s => s.style.display='none');
    document.getElementById(`tab-${t}`).style.display='block';
    if(t === 'manuscript') renderChapterList();
}

function update(cat, f, v) {
    if(cat) book[cat][f] = v; else book[f] = v;
    syncUI();
    save();
}

function syncUI() {
    document.getElementById('front-t').innerText = book.metadata.title || 'TITLE';
    document.getElementById('front-s').innerText = book.metadata.subtitle;
    document.getElementById('front-a').innerText = book.metadata.author;
    document.getElementById('spine-text').innerText = `${book.metadata.title} • ${book.metadata.author}`;
    if(book.cover.image) document.getElementById('cover-canvas').style.backgroundImage = `url(${book.cover.image})`;
    
    // Fill inputs
    document.getElementById('m-title').value = book.metadata.title;
    document.getElementById('m-author').value = book.metadata.author;
    
    calculateGlobalWordCount();
}

function renderChapterList() {
    const container = document.getElementById('chapter-nav');
    container.innerHTML = '';
    book.chapters.forEach(ch => {
        const d = document.createElement('div');
        d.className = `chapter-item ${ch.id === book.activeId ? 'active' : ''}`;
        d.innerText = ch.title;
        d.onclick = () => loadChapter(ch.id);
        container.appendChild(d);
    });
}

function loadChapter(id) {
    saveCurrentChapter();
    book.activeId = id;
    const ch = book.chapters.find(c => c.id === id);
    document.getElementById('ch-title-input').value = ch.title;
    document.getElementById('main-editor').innerHTML = ch.html;
    renderChapterList();
    calculateGlobalWordCount();
}

function saveCurrentChapter() {
    const ch = book.chapters.find(c => c.id === book.activeId);
    if(ch) {
        ch.title = document.getElementById('ch-title-input').value;
        ch.html = document.getElementById('main-editor').innerHTML;
        save();
        calculateGlobalWordCount();
    }
}

function calculateGlobalWordCount() {
    let total = 0;
    book.chapters.forEach(ch => {
        const txt = ch.html.replace(/<[^>]*>/g, ' ').trim();
        const count = txt ? txt.split(/\s+/).length : 0;
        total += count;
        if(ch.id === book.activeId) document.getElementById('ch-word-count').innerText = `${count} words`;
    });
    document.getElementById('total-words').innerText = total.toLocaleString();
}

function addNewChapter() {
    const id = Date.now();
    book.chapters.push({ id, title: `Chapter ${book.chapters.length + 1}`, html: '' });
    loadChapter(id);
}

function syncChTitle() {
    const val = document.getElementById('ch-title-input').value;
    const ch = book.chapters.find(c => c.id === book.activeId);
    ch.title = val;
    renderChapterList();
}

function exec(c, v=null) { document.execCommand(c, false, v); }

function loadCoverImg(input) {
    const r = new FileReader();
    r.onload = e => { update('cover', 'image', e.target.result); syncUI(); };
    r.readAsDataURL(input.files[0]);
}

function save() { localStorage.setItem('kdp_ultimate_data', JSON.stringify(book)); }

// EXPORT PRINT PDF
function exportPDF() {
    saveCurrentChapter();
    const mount = document.getElementById('print-mount');
    mount.innerHTML = '';

    // 1. Title Page
    mount.innerHTML += `<div class="page"><h1>${book.metadata.title}</h1><h3 style="text-align:center">${book.metadata.subtitle}</h3><p style="text-align:center; margin-top:3in">${book.metadata.author}</p></div>`;
    
    // 2. Copyright
    mount.innerHTML += `<div class="page" style="display:flex; align-items:flex-end"><div><p>© ${book.metadata.copyrightYear} ${book.metadata.author}</p><p>ISBN: ${book.metadata.isbn}</p></div></div>`;

    // 3. Dedication
    if(book.dedicationHtml) mount.innerHTML += `<div class="page" style="text-align:center; padding-top:2in"><em>${book.dedicationHtml}</em></div>`;

    // 4. Auto-Generated TOC
    let toc = `<div class="page"><h2>Contents</h2><div style="margin-top:0.5in">`;
    book.chapters.forEach((ch, i) => { toc += `<div class="toc-entry"><span>${ch.title}</span><span>${i + 5}</span></div>`; });
    mount.innerHTML += toc + `</div></div>`;

    // 5. Chapters
    book.chapters.forEach((ch, i) => {
        mount.innerHTML += `<div class="page"><h2>${ch.title}</h2>${ch.html}<div class="page-num">${i + 5}</div></div>`;
    });

    // 6. About Author
    mount.innerHTML += `<div class="page"><h2>About the Author</h2>${book.aboutAuthorHtml}</div>`;

    window.print();
}

// EXPORT EPUB
async function exportEPUB() {
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    const oebps = zip.folder("OEBPS");
    let manifest = '', spine = '';

    book.chapters.forEach((ch, i) => {
        const name = `ch${i}.xhtml`;
        oebps.file(name, `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${ch.title}</title></head><body><h1>${ch.title}</h1>${ch.html}</body></html>`);
        manifest += `<item id="c${i}" href="${name}" media-type="application/xhtml+xml"/>\n`;
        spine += `<itemref idref="c${i}"/>\n`;
    });

    oebps.file("content.opf", `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${book.metadata.title}</dc:title><dc:creator>${book.metadata.author}</dc:creator></metadata><manifest>${manifest}</manifest><spine>${spine}</spine></package>`);
    zip.folder("META-INF").file("container.xml", `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);

    const blob = await zip.generateAsync({type:"blob"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${book.metadata.title}.epub`;
    a.click();
}

syncUI();
