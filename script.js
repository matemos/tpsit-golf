const BASE_URL = "http://10.1.0.52:8180/golf";

function showSection(id, btn) {
    const sections = ['sez-campi', 'sez-giocatori', 'sez-tornei', 'sez-inserimento'];

    sections.forEach(s => {
        document.getElementById(s).style.display = (s === id) ? 'block' : 'none';
    });

    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('nav-active');
    });

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
    
    const selectT = document.getElementById('t-campo-id');
    if(selectT) {
        selectT.innerHTML = campi.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    }
}

async function caricaDettagliCampo() {
    const id = document.getElementById('select-campi').value;
    if (!id) return;

    const res = await fetch(`${BASE_URL}/campi/${id}`);
    const campo = await res.json();
    const div = document.getElementById('dettaglio-campo');

    let fotoHtml = campo.foto ? campo.foto.map(f => `<img src="${f}" width="200" style="margin:5px">`).join('') : '';
    
    const adesso = new Date();
    let torneiHtml = "<h4>Tornei in questo campo:</h4><ul>";
    if (campo.tornei) {
        campo.tornei.forEach(t => {
            const dataT = new Date(t.data);
            const stile = dataT > adesso ? "font-weight:bold; color:green;" : "color:gray;";
            const label = dataT > adesso ? "(FUTURO)" : "(PASSATO)";
            torneiHtml += `<li style="${stile}">${t.nome} - ${dataT.toLocaleDateString()} ${label}</li>`;
        });
    }
    torneiHtml += "</ul>";

    const mappaHtml = `<h4>Mappa</h4><p>Coordinate: ${campo.latitudine}, ${campo.longitudine}</p>
        <a href="https://www.google.com/maps?q=${campo.latitudine},${campo.longitudine}" target="_blank">Apri su Google Maps</a>`;

    div.innerHTML = `
        <h3>${campo.nome}</h3>
        <p>Buche: ${campo.numeroBuche} | Par: ${campo.par}</p>
        <div>${fotoHtml}</div>
        ${torneiHtml}
        ${mappaHtml}
    `;
}


async function caricaGiocatori(classifica = false) {
    const res = await fetch(`${BASE_URL}/giocatori`);
    let giocatori = await res.json();

    if (classifica) {
        giocatori.sort((a, b) => a.handicap - b.handicap);
    }

    const lista = document.getElementById('lista-giocatori');
    lista.innerHTML = "";
    giocatori.forEach(g => {
        const li = document.createElement('li');
        li.innerHTML = `${g.nome} (Handicap: ${g.handicap}) <button onclick="dettaglioGiocatore(${g.id})">Vedi Prestazioni</button>`;
        lista.appendChild(li);
    });
}

function caricaClassificaHandicap() {
    caricaGiocatori(true);
}

async function dettaglioGiocatore(id) {
    const res = await fetch(`${BASE_URL}/giocatori/${id}`);
    const g = await res.json();
    const div = document.getElementById('dettaglio-giocatore');
    
    let presHtml = g.prestazioni.map(p => `<li>Torneo: ${p.torneo.nome} - Colpi: ${p.colpi}</li>`).join('');
    div.innerHTML = `<h4>Prestazioni di ${g.nome}</h4><ul>${presHtml}</ul>`;
}

async function creaGiocatore() {
    const nome = document.getElementById('p-nome').value;
    const handicap = document.getElementById('p-handicap').value;
    
    await fetch(`${BASE_URL}/giocatori`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ nome, handicap: parseInt(handicap) })
    });
    alert("Giocatore inserito!");
    caricaGiocatori();
}

async function caricaTornei() {
    const res = await fetch(`${BASE_URL}/tornei`);
    const tornei = await res.json();
    const div = document.getElementById('lista-tornei');
    div.innerHTML = tornei.map(t => `
        <div>
            <strong>${t.nome}</strong> (${new Date(t.data).toLocaleDateString()})
            <button onclick="dettaglioTorneo(${t.id})">Classifica e Iscritti</button>
        </div>
    `).join('');
}

async function dettaglioTorneo(id) {
    const res = await fetch(`${BASE_URL}/tornei/${id}`);
    const t = await res.json();
    const div = document.getElementById('dettaglio-torneo');

    const classifica = [...t.prestazioni].sort((a, b) => a.colpi - b.colpi);

    let html = `<h4>Classifica Torneo: ${t.nome}</h4><table border="1">
        <tr><th>Giocatore</th><th>Colpi</th><th>Azione</th></tr>`;
    
    classifica.forEach(p => {
        html += `<tr>
            <td>${p.giocatore.nome}</td>
            <td><input type="number" id="edit-colpi-${p.id}" value="${p.colpi}"></td>
            <td><button onclick="aggiornaPrestazione(${p.id}, ${t.id})">Aggiorna</button></td>
        </tr>`;
    });
    html += `</table>`;
    div.innerHTML = html;
}

async function aggiornaPrestazione(presId, torneoId) {
    const nuoviColpi = document.getElementById(`edit-colpi-${presId}`).value;
    await fetch(`${BASE_URL}/prestazioni/${presId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ colpi: parseInt(nuoviColpi) })
    });
    alert("Aggiornato!");
    dettaglioTorneo(torneoId);
}


async function preparaFormInserimento() {
    const resG = await fetch(`${BASE_URL}/giocatori`);
    const giocatori = await resG.json();
    const resT = await fetch(`${BASE_URL}/tornei`);
    const tornei = await resT.json();

    document.getElementById('ins-pres-giocatore').innerHTML = giocatori.map(g => `<option value="${g.id}">${g.nome}</option>`).join('');
    document.getElementById('ins-pres-torneo').innerHTML = tornei.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
    

    caricaCampi();
}

async function creaPrestazione() {
    const gId = document.getElementById('ins-pres-giocatore').value;
    const tId = document.getElementById('ins-pres-torneo').value;
    const colpi = document.getElementById('ins-pres-colpi').value;

    await fetch(`${BASE_URL}/prestazioni`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            giocatore: { id: parseInt(gId) },
            torneo: { id: parseInt(tId) },
            colpi: parseInt(colpi)
        })
    });
    alert("Prestazione registrata!");
}

async function creaTorneo() {
    const nome = document.getElementById('t-nome').value;
    const data = document.getElementById('t-data').value;
    const campoId = document.getElementById('t-campo-id').value;

    await fetch(`${BASE_URL}/tornei`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            nome,
            data,
            campo: { id: parseInt(campoId) }
        })
    });
    alert("Torneo creato!");
}


showSection('sez-campi', document.getElementsByClassName('nav-btn')[0]);