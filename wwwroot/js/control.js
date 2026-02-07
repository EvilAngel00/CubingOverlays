let state = null;

const leftSelect = document.getElementById("leftSelect");
const rightSelect = document.getElementById("rightSelect");
const competitorDetails = document.getElementById("competitorDetails");

const solveNumberInput = document.getElementById("solveNumber");
const solveTimeInput = document.getElementById("solveTime");

let startSide = null;

document.querySelectorAll('input[data-side]').forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submit();

            const currentSide = input.dataset.side;
            const currentSolve = parseInt(input.dataset.solve);

            const otherSide = currentSide === "left" ? "right" : "left";

            let nextSide;
            let nextSolve;

            // If this is the FIRST time we hit enter, or we are switching sides
            if (startSide === null || startSide === currentSide) {
                // Move to the same solve number on the OTHER side
                nextSide = otherSide;
                nextSolve = currentSolve;
                startSide = currentSide;
            } else {
                // Move to the next solve number on the OTHER side
                nextSide = otherSide;
                nextSolve = currentSolve + 1;
            }

            const nextTarget = document.querySelector(`input[data-side="${nextSide}"][data-solve="${nextSolve}"]`);

            if (nextTarget) {
                nextTarget.focus();
                nextTarget.select();
            }
        }
    });
});

document.getElementById("submitTimesBtn")
    .addEventListener("click", submit);

leftSelect.addEventListener("change", async () => {
    selectCompetitor("left", leftSelect.value);
    await submit();
});

rightSelect.addEventListener("change", async () => {
    selectCompetitor("right", rightSelect.value)
    await submit();
});

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/overlayHub")
    .build();

async function init() {
    await connection.start();
    const res = await fetch("/api/state");
    state = await res.json();

    CompetitorManager.init();
    render();
}

init();

function render() {
    console.log("Render");
    console.log("State", state);
    if (!state) return;

    document.getElementById("event").textContent = state.round.event;
    document.getElementById("round").textContent = state.round.roundName;

    CompetitorManager.renderList(state.competitors);

    renderCompetitors();
    selectCompetitor("left", state.round.leftCompetitorWcaId);
    selectCompetitor("right", state.round.rightCompetitorWcaId);
}

function renderCompetitors() {
    console.log("Render competitors");

    [leftSelect, rightSelect].forEach((select) => {
        select.innerHTML = "";
        state.competitors.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.wcaId;
            opt.textContent = `${c.name} (${c.wcaId})`;
            select.appendChild(opt);
        });
    });

    if (state.round.leftCompetitorWcaId) {
        leftSelect.value = state.round.leftCompetitorWcaId;
    }
    else {
        state.round.leftCompetitorWcaId = leftSelect.value;
    }
    if (state.round.rightCompetitorWcaId) {
        rightSelect.value = state.round.rightCompetitorWcaId;
    }
    else {
        state.round.rightCompetitorWcaId = rightSelect.value;
    }
}

async function saveCompetitor() {
    const wcaId = document.getElementById("modal_wcaid").value;

    const newComp = {
        wcaId: wcaId,
        name: document.getElementById("modal_name").value,
        country: document.getElementById("modal_country").value
    };

    const response = await fetch("/api/addcompetitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newComp)
    });

    if (response.ok) {
        const res = await fetch("/api/state");
        state = await res.json();
        CompetitorManager.renderList(state.competitors);
        renderCompetitors();
        document.getElementById("competitor_modal").close();
    }
}

function selectCompetitor(side, competitorId) {
    console.log("selectCompetitor", side);

    const inputs = document.querySelectorAll(
        `input[data-side="${side}"]`
    );

    const propertyName = `${side}CompetitorWcaId`;
    state.round[propertyName] = competitorId;

    inputs.forEach(i => i.value = "");

    const solves = state.competitors
        .filter(s => s.wcaId === competitorId)[0]
        .solves;

    solves.forEach(s => {
        if (s) {
            const input = document.querySelector(
                `input[data-side="${side}"][data-solve="${s.solveNumber}"]`
            );

            if (!input) return;

            if (s.penalty === "dnf") {
                input.value = "DNF";
            } else {
                input.value = s.time.toFixed(2);
            }
        }
    });
}

async function submit() {
    console.log("Submit");
    const leftId = leftSelect.value;
    const rightId = rightSelect.value;

    if (!leftId || !rightId) {
        console.error("Cannot submit: One or both competitors are not selected in the dropdowns.");
        return;
    }

    state.competitors.find(c => c.wcaId === leftSelect.value).solves = getSolvesFromInputs("left", leftSelect.value);
    state.competitors.find(c => c.wcaId === rightSelect.value).solves = getSolvesFromInputs("right", rightSelect.value);

    BackupManager.save(state);
    updateLastSavedDisplay();

    console.log("State before submit", state);
    const response = await fetch(`/api/updateState`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state)
    });

    if (response.ok) {
        const updatedState = await response.json();
        state = updatedState;
    } else {
        alert("Error updating state.");
    }
    console.log("State after submit", state);
}

function getSolvesFromInputs(side, competitorId) {
    const inputs = document.querySelectorAll(`input[data-side="${side}"]`);
    const solves = [];

    inputs.forEach(input => {
        let val = input.value.trim().toLowerCase();

        if (input.value.toLowerCase() === 'd' || input.value.toLowerCase() === 'n') {
            val = "dnf";
            input.value = "DNF";
        }

        if (val) {
            let solve = {
                solveNumber: parseInt(input.dataset.solve),
                time: 0,
                penalty: "none"
            };

            if (val === "dnf") {
                solve.time = 0; // Backend usually ignores time if penalty is dnf
                solve.penalty = "dnf";
            } else {
                // Parse the number, ignore if it's not a valid number
                const parsedTime = parseFloat(val);
                if (isNaN(parsedTime)) return;

                solve.time = parsedTime;
                solve.penalty = "none";
            }

            solves.push(solve);
        }
    });
    return solves;
}

function openHistoryModal() {
    const list = document.getElementById('historyList');
    const history = BackupManager.getHistory();

    if (history.length === 0) {
        list.innerHTML = `
                        <div class="alert shadow-sm italic opacity-50 text-center py-8">
                            No backup history found yet.
                        </div>`;
    } else {
        list.innerHTML = history.map((entry, index) => `
                        <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors group">
                            <div class="flex flex-col">
                                <span class="text-xs font-bold font-mono opacity-40">${entry.timestamp}</span>
                                <span class="text-sm font-semibold">${entry.state.round.event} - ${entry.state.round.roundName}</span>
                            </div>
                            <button onclick="restoreIndex(${index})" class="btn btn-xs btn-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                                Restore
                            </button>
                        </div>
                    `).join('');
    }
    document.getElementById('history_modal').showModal();
}

async function restoreIndex(index) {
    const history = BackupManager.getHistory();
    const selected = history[index];

    if (confirm(`Are you sure you want to restore the state from ${selected.timestamp}? This will overwrite current live data.`)) {
        state = selected.state; // Overwrite current state

        render(); // Update the control panel UI
        await submit(); // Push the restored state to the server/overlay

        document.getElementById('history_modal').close();
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            let stateToRestore = null;

            // Logic to determine if the file is a single state or a history array
            if (Array.isArray(importedData) && importedData.length > 0) {
                // If it's a history file (array), take the most recent entry
                stateToRestore = importedData[0].state;
            } else if (importedData.state) {
                // If it's a single entry export
                stateToRestore = importedData.state;
            } else if (importedData.competitors && importedData.round) {
                // If it's just the raw state object itself
                stateToRestore = importedData;
            }

            if (!stateToRestore) {
                throw new Error("Invalid file format: No competition state found.");
            }

            const confirmMsg = `Restore data from "${file.name}"? 
This will overwrite all current live data for ${stateToRestore.round.event}.`;

            if (confirm(confirmMsg)) {
                state = stateToRestore;

                render();
                await submit();

                alert("State successfully restored from file.");
            }
        } catch (err) {
            console.error("Backup Load Error:", err);
            alert("Error loading backup: Make sure the file is a valid .json competition backup.");
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

function updateLastSavedDisplay() {
    const history = BackupManager.getHistory();
    const display = document.getElementById("lastSavedDisplay");

    if (history && history.length > 0) {
        display.textContent = history[0].timestamp;
        display.classList.remove('opacity-70');
        display.classList.add('opacity-100');

        display.style.transition = 'none';
        display.style.color = 'var(--p)'; // Primary color flash
        setTimeout(() => {
            display.style.transition = 'color 1s ease';
            display.style.color = ''; // Back to success/default
        }, 100);
    }
}