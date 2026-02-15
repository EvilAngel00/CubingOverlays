import { getBestSolve, getOrdinal, formatSolve } from './utils.js';

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
    const root = document.getElementById(side);
    if (!root || !competitorId) return;

    const competitor = state.competitors.find(c => c.wcaId === competitorId);
    if (!competitor) return;

    renderCompetitorHeader(root, competitor);
    renderSolveBoxes(side, root, competitor);
    renderStatsAndProjections(root, competitor.stats);
    renderNeededFor(root, competitor.stats);
    renderPersonalBests(side, competitor.stats);
}

function renderCompetitorHeader(root, competitor) {
    const nameElement = root.querySelector(".name");
    const flagWrapper = root.querySelector(".flag-wrapper");

    nameElement.textContent = competitor.name;
    flagWrapper.classList.remove('flag-error');

    const countryCode = (competitor.country || 'un').toLowerCase();
    flagWrapper.innerHTML = `
        <img 
            src="https://flagcdn.com/h80/${countryCode}.png" 
            alt="${countryCode}"
            onerror="this.style.display='none'; this.parentElement.classList.add('flag-error');"
        >`;
}

function renderSolveBoxes(side, root, competitor) {
    const timesContainer = document.getElementById(`times-${side}`);
    timesContainer.innerHTML = "";

    for (let i = 1; i <= 5; i++) {
        const solveData = competitor.solves.find(s => s && s.solveNumber === i);
        const displayTime = solveData ? formatSolve(solveData) : "—";

        const box = document.createElement("div");
        box.className = "solve-box";
        if (!solveData) box.setAttribute("data-empty", "true");

        box.textContent = displayTime;
        timesContainer.appendChild(box);
    }
}

function renderStatsAndProjections(root, stats) {
    const mainAvgBox = root.querySelector(".main-avg");
    const projGroup = root.querySelector(".projections-group");

    // Reset visibility
    [mainAvgBox, projGroup].forEach(el => {
        el.classList.remove("visible-stat");
        el.classList.add("hidden-stat");
    });

    if (stats.average !== null) {
        // Final average is available
        mainAvgBox.classList.replace("hidden-stat", "visible-stat");
        root.querySelector(".main-avg .avg-value").textContent = stats.average === -1 ? "DNF" : stats.average.toFixed(2);
        root.querySelector(".main-avg .rank-box").textContent = getOrdinal(stats.currentRank);
    }
    else if (stats.bestPossibleAverage !== null) {
        // Show projections instead
        projGroup.classList.replace("hidden-stat", "visible-stat");

        root.querySelector(".bpa .avg-value").textContent = stats.bestPossibleAverage === -1 ? "DNF" : stats.bestPossibleAverage.toFixed(2);
        root.querySelector(".bpa .rank-box").textContent = getOrdinal(stats.bestPossibleRank);

        root.querySelector(".wpa .avg-value").textContent = stats.worstPossibleAverage === -1 ? "DNF" : stats.worstPossibleAverage.toFixed(2);
        root.querySelector(".wpa .rank-box").textContent = getOrdinal(stats.worstPossibleRank);
    }
}

function renderNeededFor(root, stats) {
    const container = root.querySelector(".avg-container.needed");
    const label = container.querySelector(".avg-label");
    const valueBox = container.querySelector(".avg-value");
    const valueWrapper = container.querySelector(".avg-value-box");

    let val = stats.neededForFirst;
    let labelText = "For 1st";
    let isPodium = false;

    if (!val && stats.neededForPodium) {
        val = stats.neededForPodium;
        labelText = "For Podium";
        isPodium = true;
    }

    if (!val) {
        container.classList.add("hidden-stat");
        return;
    }

    container.classList.remove("hidden-stat");
    label.textContent = labelText;
    valueBox.textContent = val === -1 ? "Any" : val.toFixed(2);

    const color = isPodium ? "#cd7f32" : ""; // Bronze vs Default (Gold)
    label.style.backgroundColor = color;
    label.style.color = isPodium ? "white" : "";
    valueWrapper.style.borderColor = color;
}

function renderPersonalBests(side, stats) {
    const singleBox = document.getElementById(`${side}-pb-single`);
    const averageBox = document.getElementById(`${side}-pb-average`);

    singleBox.innerText = stats.personalBestSingle ? stats.personalBestSingle.toFixed(2) : "---";
    averageBox.innerText = stats.personalBestAverage ? stats.personalBestAverage.toFixed(2) : "---";
}