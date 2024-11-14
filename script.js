// script.js

const actors = [];  // Lista degli attori
let professionals = { trucco: [], capelli: [], costumi: [] };  // Schedule dei professionisti
const professionalSettings = {  // Numero di professionisti per reparto
    trucco: { count: 1 },
    capelli: { count: 1 },
    costumi: { count: 0 }
};

let pixelsPerMinute = 5; // Scaling factor for zooming

// Funzione per aggiungere una riga per un attore
function addActorRow(data = {}) {
    const container = document.getElementById("actorRows");
    const row = document.createElement("div");
    row.classList.add("input-row");

    row.innerHTML = `
        <input type="text" placeholder="Nome Attore" value="${data.name || ''}" />
        <input type="time" placeholder="Orario di Pronti" value="${data.readyTime || ''}" />
        <input type="number" placeholder="Durata Trucco (min)" value="${data.makeupDuration || ''}" min="0" />
        <input type="number" placeholder="Durata Capelli (min)" value="${data.hairDuration || ''}" min="0" />
        <input type="number" placeholder="Durata Costumi (min)" value="${data.costumeDuration || ''}" min="0" />

        <!-- Selettori dinamici per Truccatore e Parrucchiere -->
        <select class="makeup-artist-select">
            <option value="">Qualsiasi</option>
        </select>
        <select class="hairdresser-select">
            <option value="">Qualsiasi</option>
        </select>

        <button onclick="removeActorRow(this)">Rimuovi</button>
    `;

    container.appendChild(row);

    // Popola i selettori per la nuova riga
    const makeupArtistSelect = row.querySelector(".makeup-artist-select");
    const hairdresserSelect = row.querySelector(".hairdresser-select");
    populateProfessionalOptions(makeupArtistSelect, 'trucco');
    populateProfessionalOptions(hairdresserSelect, 'capelli');
}


// Funzione per rimuovere una riga di attore
function removeActorRow(button) {
    button.parentElement.remove();
}

// Aggiunge un attore alla tabella della programmazione
function addActorToScheduleTable(actor) {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${actor.name}</td>
        <td>${actor.arrivalTime || '-'}</td>
        <td>${actor.scheduleInfo.trucco || '-'}</td>
        <td>${actor.scheduleInfo.capelli || '-'}</td>
        <td>${actor.scheduleInfo.costumi || '-'}</td>
        <td>${actor.readyTime}</td>
    `;
    const scheduleTableBody = document.getElementById("scheduleTableBody");
    scheduleTableBody.appendChild(row);
}


function updateActorSchedule(actor) {
    const showStartEnd = document.getElementById("showStartEndCheckbox").checked;
    const showProfessional = document.getElementById("showProfessionalCheckbox").checked;

    const rows = document.querySelectorAll("#scheduleTableBody tr");
    rows.forEach(row => {
        const actorNameCell = row.querySelector("td:first-child");
        if (actorNameCell && actorNameCell.textContent.trim() === actor.name) {
            // Trova i task aggiornati
            const makeupTask = actor.schedule.find(t => t.type === 'trucco');
            const hairTask = actor.schedule.find(t => t.type === 'capelli');
            const costumeTask = actor.schedule.find(t => t.type === 'costumi');

            // Costruisci il contenuto delle celle in base alle checkbox
            row.querySelector('td:nth-child(3)').textContent = makeupTask ? 
                (showStartEnd ? `${makeupTask.startTime} - ${makeupTask.endTime}` : `${makeupTask.startTime}` ) +
                (showProfessional && makeupTask.professionalIndex !== undefined ? ` (${makeupTask.professionalIndex})` : '') : '-';

            row.querySelector('td:nth-child(4)').textContent = hairTask ? 
                (showStartEnd ? `${hairTask.startTime} - ${hairTask.endTime}` : `${hairTask.startTime}`) +
                (showProfessional && hairTask.professionalIndex !== undefined ? ` (${hairTask.professionalIndex})` : '') : '-';

            row.querySelector('td:nth-child(5)').textContent = costumeTask ? 
                (showStartEnd ? `${costumeTask.startTime} - ${costumeTask.endTime}` : `${costumeTask.startTime}`) +
                (showProfessional && costumeTask.professionalIndex !== undefined ? ` (${costumeTask.professionalIndex})` : '') : '-';

            // Aggiorna l'orario di arrivo e l'orario di pronti
            row.querySelector('td:nth-child(2)').textContent = actor.arrivalTime || '-';
            row.querySelector('td:nth-child(6)').textContent = actor.readyTime;

            console.log(`Updated schedule table for ${actor.name}: Arrival Time: ${actor.arrivalTime}`);
        }
    });
}

function updateAllSchedules() {
    actors.forEach(actor => updateActorSchedule(actor));
}


