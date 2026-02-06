const connection = new signalR.HubConnectionBuilder()
    .withUrl("/overlayHub")
    .build();

connection.on("StateUpdated", state => {
    console.log("StateUpdated");
    console.log("State", state);
    renderSide("left", state.round.leftCompetitorWcaId, state);
    renderSide("right", state.round.rightCompetitorWcaId, state);
});

async function start() {
    console.log("Start");
    await connection.start();
    const res = await fetch("/api/state");
    const state = await res.json();
    console.log("State", state);
    renderSide("left", state.round.leftCompetitorWcaId, state);
    renderSide("right", state.round.rightCompetitorWcaId, state);
}

start();

function renderSide(side, competitorId, state) {
    console.log("Side", side);
    const root = document.getElementById(side);
    if (!competitorId) return;

    const timesContainer = document.getElementById(`times-${side}`);

    const competitor = state.competitors.find(c => c.wcaId === competitorId);

    const nameElement = root.querySelector(".name");
    nameElement.textContent = competitor.name;

    const flagWrapper = root.querySelector(".flag-wrapper");
    flagWrapper.classList.remove('flag-error'); // Reset error state

    const countryCode = (competitor.country || 'un').toLowerCase();

    flagWrapper.innerHTML = `
        <img 
            src="https://flagcdn.com/h80/${countryCode}.png" 
            alt="${countryCode}"
            onerror="this.style.display='none'; this.parentElement.classList.add('flag-error');"
        >
    `;

    timesContainer.innerHTML = "";

    for (let i = 1; i <= 5; i++) {
        const solveData = competitor.solves.find(s => s && s.solveNumber === i);

        const displayTime = solveData ? formatSolve(solveData) : "—";

        const box = document.createElement("div");
        box.className = "solve-box";

        if (!solveData) {
            box.setAttribute("data-empty", "true");
        }

        box.textContent = displayTime;
        timesContainer.appendChild(box);
    }

    const stats = competitor.stats;
    const mainAvgBox = root.querySelector(".main-avg");
    const projGroup = root.querySelector(".projections-group");

    const bpaVal = root.querySelector(".bpa .avg-value");
    const wpaVal = root.querySelector(".wpa .avg-value");
    const mainAvgVal = root.querySelector(".main-avg .avg-value");

    // Default: Hide everything
    mainAvgBox.classList.remove("visible-stat");
    mainAvgBox.classList.add("hidden-stat");

    projGroup.classList.remove("visible-stat");
    projGroup.classList.add("hidden-stat");

    if (stats.average !== null) {
        // Show Final Average
        mainAvgBox.classList.remove("hidden-stat");
        mainAvgBox.classList.add("visible-stat");
        mainAvgVal.textContent = stats.average === -1 ? "DNF" : stats.average.toFixed(2);
    }
    else if (stats.bestPossibleAverage !== null) {
        // Show Projections
        projGroup.classList.remove("hidden-stat");
        projGroup.classList.add("visible-stat");

        bpaVal.textContent = stats.bestPossibleAverage === -1 ? "DNF" : stats.bestPossibleAverage.toFixed(2);
        wpaVal.textContent = stats.worstPossibleAverage === -1 ? "DNF" : stats.worstPossibleAverage.toFixed(2);
    }
}

function formatSolve(solve) {
    if (!solve) return "—";
    if (solve.penalty === "dnf") return "DNF";
    return solve.time.toFixed(2);
}
