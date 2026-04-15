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
            } else {
                startSide = null;
            }
        }
    });
});

document.getElementById("submitTimesBtn")
    .addEventListener("click", async () => {
        const btn = document.getElementById("submitTimesBtn");
        btn.disabled = true;
        const spinner = document.createElement("span");
        spinner.className = "loading loading-spinner loading-sm";
        btn.prepend(spinner);
        await submit();
        spinner.remove();
        btn.disabled = false;
    });

    leftSelect.addEventListener("change", async () => {
        state.leftCompetitorWcaId = leftSelect.value;
        selectCompetitor("left", leftSelect.value);
        await submit();
    });

    rightSelect.addEventListener("change", async () => {
        state.rightCompetitorWcaId = rightSelect.value;
        selectCompetitor("right", rightSelect.value);
        await submit();
    });

const hub = new SignalRManager();

hub.on("StateUpdated", updatedState => {
    console.log("State updated by another control center");
    state = updatedState;
    render();
});

async function init() {
    await hub.start();
    state = await hub.invoke("GetState");

    CompetitorManager.init();
    render();
}

init();

function render() {
    console.log("Render");
    console.log("State", state);
    if (!state) return;

    CompetitorManager.renderList(state.competitors);

    renderCompetitors();
    selectCompetitor("left", state.leftCompetitorWcaId);
    selectCompetitor("right", state.rightCompetitorWcaId);
}

function renderCompetitors() {
    console.log("Render competitors");

    [leftSelect, rightSelect].forEach((select) => {
        select.innerHTML = '<option value="">-- Select Competitor --</option>';
        state.competitors.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.wcaId;
            opt.textContent = `${c.name} (${c.wcaId})`;
            select.appendChild(opt);
        });
    });

    if (state.leftCompetitorWcaId) {
        leftSelect.value = state.leftCompetitorWcaId;
    }
    else {
        state.leftCompetitorWcaId = leftSelect.value;
    }
    if (state.rightCompetitorWcaId) {
        rightSelect.value = state.rightCompetitorWcaId;
    }
    else {
        state.rightCompetitorWcaId = rightSelect.value;
    }
}

async function saveCompetitor() {
    const wcaIdInput = document.getElementById("modal_wcaid");
    const isEditMode = wcaIdInput.disabled;
    const fetchFromWca = document.getElementById("modal_fetch_wca").checked;
    const saveBtn = document.getElementById("saveCompBtn");
    const errorDisplay = document.getElementById("wca_fetch_error");

    // Clear previous error
    errorDisplay.style.opacity = "0";
    errorDisplay.textContent = "";

    const newComp = {
        wcaId: wcaIdInput.value,
        name: document.getElementById("modal_name").value,
        country: document.getElementById("modal_country").value
    };

    // Disable button and show loading state
    saveBtn.disabled = true;
    const originalText = saveBtn.textContent;
    saveBtn.textContent = fetchFromWca ? "Fetching from WCA..." : "Saving...";

    try {
        state = await hub.invoke(isEditMode ? "UpdateCompetitor" : "AddCompetitor", newComp, fetchFromWca);
        CompetitorManager.renderList(state.competitors);
        renderCompetitors();
        document.getElementById("competitor_modal").close();
    } catch (error) {
        console.error("Error saving competitor:", error);
        errorDisplay.textContent = error.message || "Failed to save competitor. Please try again.";
        errorDisplay.style.opacity = "1";
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

function selectCompetitor(side, competitorId) {
    console.log("selectCompetitor", side);

    if (!competitorId)
        return;

    const inputs = document.querySelectorAll(
        `input[data-side="${side}"]`
    );

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

async function submit(isImport = false) {
    console.log("Submit");

    if (!state) return;

    const leftId = leftSelect.value;
    const rightId = rightSelect.value;

    if (!leftId || !rightId) {
        console.error("Cannot submit: One or both competitors are not selected in the dropdowns.");
        return;
    }

    const leftComp = state.competitors.find(c => c.wcaId === leftId);
    const rightComp = state.competitors.find(c => c.wcaId === rightId);

    if (!leftComp || !rightComp) {
        console.error("Cannot submit: Competitor not found in state.", { leftId, rightId });
        return;
    }

    leftComp.solves = getSolvesFromInputs("left", leftId);
    rightComp.solves = getSolvesFromInputs("right", rightId);

    BackupManager.save(state);
    updateLastSavedDisplay();

    console.log("isImport", isImport);
    console.log("State before submit", state);

    try {
        if (isImport) {
            state = await hub.invoke("ImportState", state);
        } else {
            state = await hub.invoke("UpdateState", state);
        }
    } catch (err) {
        console.error(err);
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
        await submit(true); // Push the restored state to the server/overlay

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
                await submit(true);

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

async function processBatchImport() {
    const textarea = document.getElementById('batch_ids');
    const btn = document.getElementById('batchConfirmBtn');
    const ids = textarea.value.split('\n')
        .map(id => id.trim().toUpperCase())
        .filter(id => id.length > 0);

    if (ids.length === 0) return;

    // UI Feedback
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = `Importing ${ids.length} competitor(s)...`;

    try {
        state = await hub.invoke("BatchImportCompetitors", ids);

        CompetitorManager.renderList(state.competitors);
        renderCompetitors();
        
        // Success - close modal
        textarea.value = '';
        document.getElementById('batch_modal').close();
    } catch (err) {
        console.error("Batch import failed", err);
        
        // Even if there's an error, we should have received StateUpdated
        // so render the updated state with successful imports
        CompetitorManager.renderList(state.competitors);
        renderCompetitors();
        
        alert(`Batch Import Error:\n\n${err.message}`);
        
        // Close modal after error shown
        textarea.value = '';
        document.getElementById('batch_modal').close();
    } finally {
        // Cleanup
        btn.disabled = false;
        btn.textContent = originalText;
    }
}