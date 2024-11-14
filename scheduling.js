// scheduling.js

// Inizializza la disponibilità dei professionisti
function initializeProfessionals() {
    professionals = { trucco: [], capelli: [], costumi: [] };
    Object.keys(professionals).forEach(key => {
        professionals[key] = [];
        for (let i = 0; i < professionalSettings[key].count; i++) {
            professionals[key].push([]);
        }
    });
}

// Aggiorna le impostazioni dei professionisti in base ai valori di input
function updateProfessionalSettings() {
    Object.keys(professionalSettings).forEach(key => {
        const countInput = document.getElementById(`${key}-count`);
        professionalSettings[key].count = parseInt(countInput.value);
    });
    initializeProfessionals();
    alert("Configurazione dei professionisti aggiornata.");
}

// Genera la programmazione degli attori
function generateSchedule() {
    const scheduleTableBody = document.getElementById("scheduleTableBody");
    scheduleTableBody.innerHTML = "";

    //document.getElementById("actorChartContainer").innerHTML = "";
    //document.getElementById("professionalChartContainer").innerHTML = "";

    const rows = document.querySelectorAll("#actorRows .input-row");
    actors.length = 0;

    rows.forEach(row => {
        const inputs = row.querySelectorAll("input");
        const actor = {
            name: inputs[0].value.trim(),
            readyTime: inputs[1].value,
            tasks: [],
            schedule: [],
            scheduleInfo: {},
            arrivalTime: ''
        };

        const makeupDuration = parseInt(inputs[2].value);
        const hairDuration = parseInt(inputs[3].value);
        const costumeDuration = parseInt(inputs[4].value);

        if (makeupDuration > 0) {
            actor.tasks.push({ type: 'trucco', duration: makeupDuration, actorName: actor.name });
        }
        if (hairDuration > 0) {
            actor.tasks.push({ type: 'capelli', duration: hairDuration, actorName: actor.name });
        }
        if (costumeDuration > 0) {
            actor.tasks.push({ type: 'costumi', duration: costumeDuration, actorName: actor.name });
        }

        actors.push(actor);
    });

    actors.sort((a, b) => a.readyTime.localeCompare(b.readyTime));
    initializeProfessionals();

    for (const actor of actors) {
        let scheduled = false;
        let attempt = 0;
        const maxAttempts = 12;

        while (!scheduled && attempt <= maxAttempts) {
            const totalTaskDuration = actor.tasks.reduce((sum, task) => sum + task.duration, 0);
            const additionalTime = attempt * 5;
            actor.arrivalTime = subtractMinutes(actor.readyTime, totalTaskDuration + additionalTime);
            actor.arrivalTime = roundTimeToNearest5(actor.arrivalTime);
            scheduled = trySchedulingActor(actor);

            if (!scheduled) {
                attempt++;
            }
        }

        if (!scheduled) {
            alert(`Impossibile programmare ${actor.name} con i professionisti disponibili.`);
            continue;
        }

        addActorToScheduleTable(actor);
    }

    //generateActorCharts();
    //generateProfessionalCharts();
    updateTimeline();
}

// Funzione per tentare di schedulare un attore
function trySchedulingActor(actor) {
    const permutations = generateTaskPermutations(actor.tasks);

    for (const taskOrder of permutations) {
        let tempProfessionals = JSON.parse(JSON.stringify(professionals));

        actor.schedule = [];
        actor.scheduleInfo = {};

        const success = scheduleActorTasks(actor, taskOrder, tempProfessionals);

        if (success) {
            professionals = tempProfessionals;
            return true;
        }
    }
    return false;
}

// Funzione per schedulare i task di un attore con un dato ordine

function scheduleActorTasks(actor, taskOrder, tempProfessionals) {
    let currentTime = actor.arrivalTime;

    for (const task of taskOrder) {
        const taskDuration = task.duration;
        const earliestStartTime = findEarliestStartTimeForTask(task, currentTime, actor.readyTime, tempProfessionals);

        if (!earliestStartTime) {
            return false;
        }

        const taskEndTime = addMinutes(earliestStartTime, task.duration);
        currentTime = taskEndTime;

        if (professionalSettings[task.type].count > 0) {
            // Assegna il task al professionista specifico e ottieni l'indice
            const assignedProfessionalIndex = assignTaskToProfessional(task, earliestStartTime, taskEndTime, tempProfessionals);
            task.professionalIndex = assignedProfessionalIndex; // Assegna l'indice al task
        }

        actor.schedule.push({
            startTime: earliestStartTime,
            endTime: taskEndTime,
            type: task.type,
            actorName: actor.name,
            professionalIndex: task.professionalIndex // Assegna anche qui per chiarezza
        });
        actor.scheduleInfo[task.type] = earliestStartTime;
    }

    return true;
}

function findEarliestStartTimeForTask(task, startTime, readyTime, tempProfessionals) {
    let earliestStartTime = startTime;

    while (isTimeBeforeOrEqual(earliestStartTime, readyTime)) {
        const taskEndTime = addMinutes(earliestStartTime, task.duration);

        if (isTimeBeforeOrEqual(taskEndTime, readyTime)) {
            if (professionalSettings[task.type].count > 0) {
                const isAvailable = isProfessionalAvailable(task, earliestStartTime, taskEndTime, tempProfessionals);
                if (isAvailable) {
                    return earliestStartTime;
                } else {
                    earliestStartTime = findNextAvailableTimeForProfessional(task, earliestStartTime, readyTime, tempProfessionals);
                    if (!earliestStartTime) return null;
                }
            } else {
                return earliestStartTime;
            }
        } else {
            return null;
        }
    }
    return null;
}

function findNextAvailableTimeForProfessional(task, currentStartTime, readyTime, tempProfessionals) {
    const professionalsOfType = tempProfessionals[task.type];
    let nextAvailableTime = null;

    professionalsOfType.forEach((professionalSchedule, index) => {
        for (let i = 0; i <= professionalSchedule.length; i++) {
            const prevSlotEnd = i === 0 ? currentStartTime : professionalSchedule[i - 1].endTime;
            const nextSlotStart = i === professionalSchedule.length ? readyTime : professionalSchedule[i].startTime;

            const slotStart = maxTime(currentStartTime, prevSlotEnd);
            const potentialEndTime = addMinutes(slotStart, task.duration);

            if (isTimeBeforeOrEqual(potentialEndTime, nextSlotStart) && isTimeBeforeOrEqual(potentialEndTime, readyTime)) {
                nextAvailableTime = slotStart;
                task.professionalIndex = index;
                return;
            }
        }
    });

    return nextAvailableTime;
}

function isProfessionalAvailable(task, startTime, endTime, tempProfessionals) {
    const professionalsOfType = tempProfessionals[task.type];
    for (let i = 0; i < professionalsOfType.length; i++) {
        const professionalSchedule = professionalsOfType[i];
        const isAvailable = professionalSchedule.every(slot => {
            return isTimeBeforeOrEqual(slot.endTime, startTime) || isTimeBeforeOrEqual(endTime, slot.startTime);
        });
        if (isAvailable) {
            task.professionalIndex = i;
            return true;
        }
    }
    return false;
}

function assignTaskToProfessional(task, startTime, endTime, tempProfessionals) {
    const professionalsOfType = tempProfessionals[task.type];
    for (let i = 0; i < professionalsOfType.length; i++) {
        const professionalSchedule = professionalsOfType[i];
        const isAvailable = professionalSchedule.every(slot => {
            return isTimeBeforeOrEqual(slot.endTime, startTime) || isTimeBeforeOrEqual(endTime, slot.startTime);
        });
        if (isAvailable) {
            // Aggiungi il task al professionista specifico e ordina il programma
            professionalSchedule.push({ startTime, endTime, actorName: task.actorName });
            professionalSchedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
            return i; // Restituisci l'indice del professionista assegnato
        }
    }
    return null;
}

function generateTaskPermutations(tasks) {
    if (tasks.length <= 1) return [tasks];
    const permutations = [];
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const remainingTasks = tasks.slice(0, i).concat(tasks.slice(i + 1));
        const remainingPermutations = generateTaskPermutations(remainingTasks);
        for (const permutation of remainingPermutations) {
            permutations.push([task].concat(permutation));
        }
    }
    return permutations;
}
