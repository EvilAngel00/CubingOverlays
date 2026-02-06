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