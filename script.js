const BASE_URL = "http://10.1.0.52:8180/golf";

function showSection(id, btn) {
    const sections = ['sez-campi', 'sez-giocatori', 'sez-tornei', 'sez-inserimento'];

    sections.forEach(s => {
        document.getElementById(s).style.display = (s === id) ? 'flex' : 'none';
    });

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-active'));
    btn.classList.add('nav-active');

    if (id === 'sez-campi') caricaCampi();
    if (id === 'sez-giocatori') caricaGiocatori();
    if (id === 'sez-tornei') caricaTornei();
    if (id === 'sez-inserimento') preparaFormInserimento();
}


async function caricaCampi() {
    const res = await fetch(`${BASE_URL}/campi`);
    const campi = await res.json();
    const select = document.getElementById('select-campi');
    select.innerHTML = '<option value="">Seleziona un campo...</option>';
    campi.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
    });
}

async function caricaDettagliCampo() {
    const id = document.getElementById('select-campi').value;
    if (!id) return;

    const res = await fetch(`${BASE_URL}/campi/${id}`);
    const campo = await res.json();
    const div = document.getElementById('dettaglio-campo');

    const fotoHtml = (campo.foto && campo.foto.length > 0) 
        ? `<div class="photos">${campo.foto.map(f => `<img src="${f}" alt="Foto">`).join('')}</div>` 
        : '';

    const adesso = new Date();
    let torneiHtml = '<h4>Tornei in programma</h4><ul class="list-container">';
    if (campo.tornei && campo.tornei.length > 0) {
        campo.tornei.forEach(t => {
            const dataT = new Date(t.data);
            const isFuturo = dataT > adesso;
            torneiHtml += `<li style="border-left: 4px solid ${isFuturo ? '#4caf50' : '#555'}">
                ${t.nome} <span>${dataT.toLocaleDateString()}</span>
            </li>`;
        });
    } else {
        torneiHtml += '<li>Nessun torneo registrato</li>';
    }
    torneiHtml += '</ul>';

    div.innerHTML = `
        <h3>${campo.nome}</h3>
        <p><strong>Configurazione:</strong> ${campo.numeroBuche} Buche | Par ${campo.par}</p>
        ${fotoHtml}
        ${torneiHtml}
        <div style="margin-top:20px">
            <a href="https://www.google.com/maps?q=${campo.latitudine},${campo.longitudine}" target="_blank" class="btn-primary" style="text-decoration:none; display:inline-block">Apri Mappa</a>
        </div>
    `;
}

async function caricaGiocatori(classifica = false) {
    const res = await fetch(`${BASE_URL}/giocatori`);
    let giocatori = await res.json();
    if (classifica) giocatori.sort((a, b) => a.handicap - b.handicap);

    const lista = document.getElementById('lista-giocatori');
    lista.innerHTML = giocatori.map(g => `
        <li>
            ${g.nome} (HCP: ${g.handicap})
            <button class="btn-primary" style="padding:4px 8px; font-size:0.7rem" onclick="dettaglioGiocatore(${g.id})">Info</button>
        </li>
    `).join('');
}

async function dettaglioGiocatore(id) {
    const res = await fetch(`${BASE_URL}/giocatori/${id}`);
    const g = await res.json();
    const div = document.getElementById('dettaglio-giocatore');
    const presHtml = g.prestazioni.map(p => `<li>${p.torneo.nome}: <strong>${p.colpi} colpi</strong></li>`).join('');
    div.innerHTML = `<h4>Prestazioni di ${g.nome}</h4><ul class="list-container">${presHtml || '<li>Nessuna gara disputata</li>'}</ul>`;
}

async function creaGiocatore() {
    const nome = document.getElementById('p-nome').value;
    const handicap = document.getElementById('p-handicap').value;
    if(!nome || !handicap) return alert("Compila i campi");

    await fetch(`${BASE_URL}/giocatori`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ nome, handicap: parseInt(handicap) })
    });
    caricaGiocatori();
}


async function caricaTornei() {
    const res = await fetch(`${BASE_URL}/tornei`);
    const tornei = await res.json();
    document.getElementById('lista-tornei').innerHTML = tornei.map(t => `
        <div>
            ${t.nome}
            <button class="btn-primary" style="padding:4px 8px; font-size:0.7rem" onclick="dettaglioTorneo(${t.id})">Classifica</button>
        </div>
    `).join('');
}

async function dettaglioTorneo(id) {
    const res = await fetch(`${BASE_URL}/tornei/${id}`);
    const t = await res.json();
    const div = document.getElementById('dettaglio-torneo');
    const classifica = [...t.prestazioni].sort((a, b) => a.colpi - b.colpi);

    let html = `<h3>Classifica: ${t.nome}</h3><table>
        <thead><tr><th>Giocatore</th><th>Colpi</th><th>Azioni</th></tr></thead><tbody>`;
    classifica.forEach(p => {
        html += `<tr>
            <td>${p.giocatore.nome}</td>
            <td><input type="number" id="edit-colpi-${p.id}" value="${p.colpi}" style="width:60px; margin:0"></td>
            <td><button class="btn-primary" onclick="aggiornaPrestazione(${p.id}, ${t.id})">OK</button></td>
        </tr>`;
    });
    div.innerHTML = html + `</tbody></table>`;
}

async function aggiornaPrestazione(presId, torneoId) {
    const nuoviColpi = document.getElementById(`edit-colpi-${presId}`).value;
    await fetch(`${BASE_URL}/prestazioni/${presId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ colpi: parseInt(nuoviColpi) })
    });
    dettaglioTorneo(torneoId);
}


async function preparaFormInserimento() {
    const [resG, resT, resC] = await Promise.all([
        fetch(`${BASE_URL}/giocatori`),
        fetch(`${BASE_URL}/tornei`),
        fetch(`${BASE_URL}/campi`)
    ]);
    
    const giocatori = await resG.json();
    const tornei = await resT.json();
    const campi = await resC.json();

    document.getElementById('ins-pres-giocatore').innerHTML = giocatori.map(g => `<option value="${g.id}">${g.nome}</option>`).join('');
    document.getElementById('ins-pres-torneo').innerHTML = tornei.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
    document.getElementById('t-campo-id').innerHTML = campi.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
}

async function creaPrestazione() {
    const body = {
        giocatore: { id: parseInt(document.getElementById('ins-pres-giocatore').value) },
        torneo: { id: parseInt(document.getElementById('ins-pres-torneo').value) },
        colpi: parseInt(document.getElementById('ins-pres-colpi').value)
    };
    await fetch(`${BASE_URL}/prestazioni`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
    alert("Registrata!");
}

async function creaTorneo() {
    const body = {
        nome: document.getElementById('t-nome').value,
        data: document.getElementById('t-data').value,
        campo: { id: parseInt(document.getElementById('t-campo-id').value) }
    };
    await fetch(`${BASE_URL}/tornei`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
    alert("Torneo Creato!");
}

// Init
caricaCampi();