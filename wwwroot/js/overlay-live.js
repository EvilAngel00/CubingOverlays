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
    const avgVal = root.querySelector(".main-avg .avg-value");

    const bpaRankBox = root.querySelector(".bpa .rank-box");
    const wpaRankBox = root.querySelector(".wpa .rank-box");
    const avgRankBox = root.querySelector(".main-avg .rank-box");

    // Default: Hide everything
    mainAvgBox.classList.remove("visible-stat");
    mainAvgBox.classList.add("hidden-stat");

    projGroup.classList.remove("visible-stat");
    projGroup.classList.add("hidden-stat");

    if (stats.average !== null) {
        // Show Final Average
        mainAvgBox.classList.remove("hidden-stat");
        mainAvgBox.classList.add("visible-stat");
        avgVal.textContent = stats.average === -1 ? "DNF" : stats.average.toFixed(2);
        avgRankBox.textContent = getOrdinal(calculateProjectedRank(stats.average, competitorId, state.competitors, true));
    }
    else if (stats.bestPossibleAverage !== null) {
        // Show Projections
        projGroup.classList.remove("hidden-stat");
        projGroup.classList.add("visible-stat");

        bpaVal.textContent = stats.bestPossibleAverage === -1 ? "DNF" : stats.bestPossibleAverage.toFixed(2);
        bpaRankBox.textContent = getOrdinal(calculateProjectedRank(stats.bestPossibleAverage, competitorId, state.competitors));

        wpaVal.textContent = stats.worstPossibleAverage === -1 ? "DNF" : stats.worstPossibleAverage.toFixed(2);
        wpaRankBox.textContent = getOrdinal(calculateProjectedRank(stats.worstPossibleAverage, competitorId, state.competitors));
    }
}

function formatSolve(solve) {
    if (!solve) return "—";
    if (solve.penalty === "dnf") return "DNF";
    return solve.time.toFixed(2);
}

function calculateProjectedRank(targetValue, currentId, allCompetitors) {
    if (targetValue === null) return null;

    // 1. Get the "best current standing" for everyone else
    const fieldBestValues = allCompetitors
        .filter(c => c.wcaId !== currentId) // exclude self
        .map(c => c.stats.average)
        .filter(v => v !== null);

    // 2. Rank is 1 + (how many OTHER people are strictly better than you)
    let betterCount = 0;

    fieldBestValues.forEach(value => {
        // A value is better if it's not DNF (-1) AND 
        // (the target is a DNF OR the field value is lower)
        const isFieldBetter = (value !== -1 && (targetValue === -1 || value < targetValue));
        if (isFieldBetter) {
            betterCount++;
        }
    });

    return betterCount + 1;
}

function getOrdinal(n) {
    if (!n) return "--";
    const s = ["th", "st", "nd", "rd"],
        v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
