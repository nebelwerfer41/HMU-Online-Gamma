// timelineVis.js

// Inizializzazione dei dataset per i gruppi e gli elementi
var groups = new vis.DataSet();
var items = new vis.DataSet();
var timeline;

// Funzione per aggiornare la timeline con i dati attuali dei professionisti e degli attori
function updateTimeline() {
    // Svuota i dataset esistenti
    groups.clear();
    items.clear();

    let groupValue = 1;

    // Creazione dei gruppi per ogni professionista specifico con colori di sfondo
    if (professionalSettings.trucco.count > 0) {
        for (let i = 0; i < professionalSettings.trucco.count; i++) {
            const groupId = `truccatore${i + 1}`;
            groups.add({ id: groupId, content: `Truccatore ${i + 1}`, className: 'trucco', value: groupValue });
            groupValue++;
        }
    }

    if (professionalSettings.capelli.count > 0) {
        for (let i = 0; i < professionalSettings.capelli.count; i++) {
            const groupId = `parrucchiere${i + 1}`;
            groups.add({ id: groupId, content: `Parrucchiere ${i + 1}`, className: 'capelli', value: groupValue });
            groupValue++;
        }
    }

    // Gruppo per i costumi, che non ha sottogruppi
    groups.add({ id: 'COSTUMI', content: 'Costumi', className: 'costumi', value: groupValue });

    console.log("Gruppi aggiornati:", groups.get()); // Log per verificare i gruppi aggiornati

    // Aggiungi gli elementi (task) per ogni attore con classi di colore
    actors.forEach(actor => {
        actor.schedule.forEach(task => {
            let groupId;
            let taskClass;
            if (task.type === 'trucco') {
                groupId = `truccatore${task.professionalIndex + 1}`;
                taskClass = 'trucco';
            } else if (task.type === 'capelli') {
                groupId = `parrucchiere${task.professionalIndex + 1}`;
                taskClass = 'capelli';
            } else {
                groupId = 'COSTUMI';
                taskClass = 'costumi';
            }

            const item = {
                id: actor.name + '-' + task.type,
                group: groupId,
                start: new Date(`2023-01-01T${task.startTime}:00`),
                end: new Date(`2023-01-01T${task.endTime}:00`),
                content: `${actor.name} - ${task.type}`,
                className: taskClass
            };

            items.add(item);
        });
    });

    const { startDate, endDate } = calculateTimelineRange();

    function onMove(item, callback) {
        console.log(`Moved item: ${item.content}, New Start: ${item.start}, New End: ${item.end}`);

        const actor = actors.find(a => a.name === item.content.split(' - ')[0]);
        const task = actor.schedule.find(t => t.type === item.content.split(' - ')[1].toLowerCase());

        // Converti gli orari nel fuso orario locale
        const localStart = new Date(item.start.getTime() - item.start.getTimezoneOffset() * 60000);
        const localEnd = new Date(item.end.getTime() - item.end.getTimezoneOffset() * 60000);

        task.startTime = localStart.toISOString().substr(11, 5);
        task.endTime = localEnd.toISOString().substr(11, 5);

        // Calcola e aggiorna l'orario di arrivo se necessario
        const newArrivalTime = calculateNewArrivalTime(actor);
        if (newArrivalTime !== actor.arrivalTime) {
            console.log(`Updating arrival time for ${actor.name} from ${actor.arrivalTime} to ${newArrivalTime}`);
            actor.arrivalTime = newArrivalTime;
        }

        // Aggiorna sempre la tabella degli orari
        updateActorSchedule(actor);
        callback(item);
    }

    function onUpdate(item, callback) {
        console.log(`Updated item: ${item.content}, New Start: ${item.start}, New End: ${item.end}`);

        const actor = actors.find(a => a.name === item.content.split(' - ')[0]);
        const task = actor.schedule.find(t => t.type === item.content.split(' - ')[1].toLowerCase());

        // Converti gli orari nel fuso orario locale
        const localStart = new Date(item.start.getTime() - item.start.getTimezoneOffset() * 60000);
        const localEnd = new Date(item.end.getTime() - item.end.getTimezoneOffset() * 60000);

        task.startTime = localStart.toISOString().substr(11, 5);
        task.endTime = localEnd.toISOString().substr(11, 5);

        // Calcola e aggiorna l'orario di arrivo se necessario
        const newArrivalTime = calculateNewArrivalTime(actor);
        if (newArrivalTime !== actor.arrivalTime) {
            console.log(`Updating arrival time for ${actor.name} from ${actor.arrivalTime} to ${newArrivalTime}`);
            actor.arrivalTime = newArrivalTime;
        }

        // Aggiorna sempre la tabella degli orari
        updateActorSchedule(actor);
        callback(item);
    }




    var options = {
        groupOrder: function (a, b) {
            return a.value - b.value;
        },
        editable: {
            updateTime: true,
            updateGroup: true
        },
        start: startDate,
        end: endDate,
        snap: function (date) {
            const milliseconds = 1000 * 60 * 5;
            return Math.round(date / milliseconds) * milliseconds;
        },
        onMove: onMove,
        onUpdate: onUpdate,
        zoomMin: 1000 * 60 * 60,             // one hour in milliseconds
        zoomMax: 1000 * 60 * 60 * 12     // 12h in milliseconds
    };


    if (timeline) {
        timeline.setGroups(groups);
        timeline.setItems(items);
        timeline.setOptions(options);
    } else {
        const container = document.getElementById('visualization');
        timeline = new vis.Timeline(container, items, groups, options);
    }
}

function calculateNewArrivalTime(actor) {
    // Trova il task con l'orario di inizio più anticipato tra tutti i task dell'attore
    const earliestTaskStartTime = actor.schedule.reduce((earliest, task) => {
        return isTimeBefore(task.startTime, earliest) ? task.startTime : earliest;
    }, actor.readyTime); // Usa `readyTime` come valore iniziale di confronto

    console.log(actor.schedule);
    const roundedArrivalTime = roundTimeToNearest5(earliestTaskStartTime);
    console.log(`Calculated new arrival time for ${actor.name}: ${roundedArrivalTime}`);

    return roundedArrivalTime;
}




// Funzione per aggiornare l'intera tabella di programmazione
function updateScheduleTable() {
    const scheduleTableBody = document.getElementById("scheduleTableBody");

    if (!scheduleTableBody) {
        console.error("Elemento scheduleTableBody non trovato nel DOM.");
        return;
    }

    scheduleTableBody.innerHTML = ""; // Svuota la tabella

    // Rigenera la tabella usando i dati aggiornati
    actors.forEach(actor => {
        const row = document.createElement("tr");

        // Crea le celle per ciascuna informazione dell'attore
        const nameCell = document.createElement("td");
        nameCell.textContent = actor.name;
        row.appendChild(nameCell);

        const arrivalTimeCell = document.createElement("td");
        arrivalTimeCell.textContent = actor.arrivalTime || '-';
        row.appendChild(arrivalTimeCell);

        const truccoTimeCell = document.createElement("td");
        truccoTimeCell.textContent = actor.scheduleInfo.trucco || '-';
        row.appendChild(truccoTimeCell);

        const capelliTimeCell = document.createElement("td");
        capelliTimeCell.textContent = actor.scheduleInfo.capelli || '-';
        row.appendChild(capelliTimeCell);

        const costumiTimeCell = document.createElement("td");
        costumiTimeCell.textContent = actor.scheduleInfo.costumi || '-';
        row.appendChild(costumiTimeCell);

        const readyTimeCell = document.createElement("td");
        readyTimeCell.textContent = actor.readyTime;
        row.appendChild(readyTimeCell);

        // Aggiungi la riga alla tabella
        scheduleTableBody.appendChild(row);
    });
    console.log("Tabella aggiornata con i nuovi dati degli attori.");
}


// Funzione per calcolare l'intervallo di visualizzazione della timeline con margine
function calculateTimelineRange() {
    let minTime = "23:59";
    let maxTime = "00:00";

    actors.forEach(actor => {
        actor.schedule.forEach(task => {
            if (isTimeBefore(task.startTime, minTime)) {
                minTime = task.startTime;
            }
            if (isTimeBefore(maxTime, task.endTime)) {
                maxTime = task.endTime;
            }
        });
        if (isTimeBefore(maxTime, actor.readyTime)) {
            maxTime = actor.readyTime;
        }
    });

    // Aggiungi un margine di 15 minuti a minTime e maxTime
    const startTime = subtractMinutes(minTime, 15);
    const endTime = addMinutes(maxTime, 15);

    console.log("Intervallo di tempo calcolato:", { startTime, endTime }); // Log per l'intervallo di tempo

    // Converte gli orari in oggetti Date
    const startDate = new Date(`2023-01-01T${startTime}:00`);
    const endDate = new Date(`2023-01-01T${endTime}:00`);

    return { startDate, endDate };
}

// Chiamata alla funzione di aggiornamento quando viene generata la programmazione
updateTimeline();

// Aggiunge minuti a un orario e arrotonda ai 5 minuti più vicini
function addMinutes(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    let totalMins = hours * 60 + mins + minutes;
    totalMins = Math.round(totalMins / 5) * 5; // Arrotonda ai 5 minuti più vicini
    totalMins = totalMins % (24 * 60); // Gestisce l'overflow
    const newHours = Math.floor(totalMins / 60);
    const newMins = totalMins % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

// Sottrae minuti da un orario e arrotonda ai 5 minuti più vicini
function subtractMinutes(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    let totalMins = hours * 60 + mins - minutes;
    totalMins = Math.round(totalMins / 5) * 5; // Arrotonda ai 5 minuti più vicini
    if (totalMins < 0) totalMins += 24 * 60;  // Gestisce tempi negativi
    const newHours = Math.floor(totalMins / 60) % 24;
    const newMins = totalMins % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

// Arrotonda un orario ai 5 minuti più vicini
function roundTimeToNearest5(time) {
    const [hours, mins] = time.split(':').map(Number);
    let totalMins = hours * 60 + mins;
    totalMins = Math.round(totalMins / 5) * 5;
    totalMins = totalMins % (24 * 60);
    const newHours = Math.floor(totalMins / 60);
    const newMins = totalMins % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

// Converte un orario in minuti (per la grafica)
function timeToMinutes(time) {
    const [hours, mins] = time.split(':').map(Number);
    return (hours * 60 + mins);
}

// Confronta se time1 è prima di time2
function isTimeBefore(time1, time2) {
    return timeToMinutes(time1) < timeToMinutes(time2);
}

// Confronta se time1 è prima o uguale a time2
function isTimeBeforeOrEqual(time1, time2) {
    return timeToMinutes(time1) <= timeToMinutes(time2);
}

// Calcola la differenza in minuti tra due orari
function timeDifferenceInMinutes(time1, time2) {
    return timeToMinutes(time1) - timeToMinutes(time2);
}

function maxTime(time1, time2) {
    return isTimeBefore(time1, time2) ? time2 : time1;
}

function minTime(time1, time2) {
    return isTimeBefore(time1, time2) ? time1 : time2;
}
