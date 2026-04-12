import { getOrdinal, formatSolve } from './utils.js';

const hub = new SignalRManager();

var settings = null;

hub.on("StateUpdated", state => {
    console.log("StateUpdated", state);
    renderSide("left", state.leftCompetitorWcaId, state);
    renderSide("right", state.rightCompetitorWcaId, state);
});

hub.on("SettingsUpdated", (updatedSettings) => {
    console.log("Settings updated from server:", updatedSettings);
    applySettings(updatedSettings);
});

async function start() {
    console.log("Start");
    await hub.start();
    const state = await hub.invoke("GetState");
    console.log("State", state);

    const fetchedSettings = await hub.invoke("GetDisplaySettings");
    applySettings(fetchedSettings);

    renderSide("left", state.leftCompetitorWcaId, state);
    renderSide("right", state.rightCompetitorWcaId, state);
}

start();

function applySettings(updatedSettings, updateUI = true) {
    if (!updatedSettings || !updatedSettings.headToHead) return;

    settings = updatedSettings;

    if (updateUI) {
        applyPlayerColors();
    }
}

function applyPlayerColors() {
    if (!settings || !settings.headToHead) return;

    const { leftPlayerColor, rightPlayerColor } = settings.headToHead;

    const leftEl = document.getElementById("left");
    const rightEl = document.getElementById("right");

    if (leftEl && leftPlayerColor) {
        leftEl.style.setProperty("--player-color", leftPlayerColor);
    }

    if (rightEl && rightPlayerColor) {
        rightEl.style.setProperty("--player-color", rightPlayerColor);
    }

    console.log(`Applied H2H Settings: Left=${leftPlayerColor}, Right=${rightPlayerColor}`);
}

function renderSide(side, competitorId, state) {
    const root = document.getElementById(side);
    if (!root || !competitorId) return;

    const competitor = state.competitors.find(c => c.wcaId === competitorId);
    if (!competitor) return;

    renderCompetitorHeader(root, competitor);
    renderSolveBoxes(side, root, competitor);
    renderStatsAndProjections(root, competitor.stats);
    renderNeededFor(root, competitor);
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

    const validSolves = competitor.solves
        .filter(s => s && s.time !== undefined)
        .map(s => ({
            solveNumber: s.solveNumber,
            time: s.time,
            isDNF: s.penalty === "dnf" || s.time === -1
        }));

    let bestTime = Infinity;
    let worstTime = -Infinity;
    let bestSolveNumber = -1;
    let worstSolveNumber = -1;

    if (validSolves.length >= 2) {
        validSolves.forEach(s => {
            const currentTime = s.isDNF ? 999999 : s.time;
            if (!s.isDNF && s.time < bestTime) {
                bestTime = s.time;
                bestSolveNumber = s.solveNumber;
            }
            if (currentTime > worstTime) {
                worstTime = currentTime;
                worstSolveNumber = s.solveNumber;
            }
        });
    }

    for (let i = 1; i <= 5; i++) {
        const solveData = competitor.solves.find(s => s && s.solveNumber === i);
        const displayTime = solveData ? formatSolve(solveData) : "—";

        const box = document.createElement("div");
        box.className = "solve-box";

        if (!solveData) {
            box.setAttribute("data-empty", "true");
        } else {
            if (solveData.solveNumber === bestSolveNumber && bestTime !== Infinity) {
                box.classList.add("best-time");
            }
            if (solveData.solveNumber === worstSolveNumber && worstTime !== -Infinity) {
                box.classList.add("worst-time");
            }
        }

        box.textContent = displayTime;
        timesContainer.appendChild(box);
    }
}

function renderStatsAndProjections(root, stats) {
    root.querySelector(".main-avg .avg-value").textContent = "";
    root.querySelector(".main-avg .rank-box").textContent = "";
    root.querySelector(".bpa .avg-value").textContent = "";
    root.querySelector(".bpa .rank-box").textContent = "";
    root.querySelector(".wpa .avg-value").textContent = "";
    root.querySelector(".wpa .rank-box").textContent = "";

    if (stats.average !== null) {
        root.querySelector(".main-avg .avg-value").textContent = stats.average === -1 ? "DNF" : stats.average.toFixed(2);
        root.querySelector(".main-avg .rank-box").textContent = getOrdinal(stats.currentRank);
    } else if (stats.bestPossibleAverage !== null) {
        root.querySelector(".bpa .avg-value").textContent = stats.bestPossibleAverage === -1 ? "DNF" : stats.bestPossibleAverage.toFixed(2);
        root.querySelector(".bpa .rank-box").textContent = getOrdinal(stats.bestPossibleRank);
        root.querySelector(".wpa .avg-value").textContent = stats.worstPossibleAverage === -1 ? "DNF" : stats.worstPossibleAverage.toFixed(2);
        root.querySelector(".wpa .rank-box").textContent = getOrdinal(stats.worstPossibleRank);
    }
}

function renderNeededFor(root, competitor) {
    const containers = root.querySelectorAll(".avg-container.needed");
    const stats = competitor.stats;

    const neededValues = [
        { rank: 1, value: stats.neededForFirst },
        { rank: 2, value: stats.neededForSecond },
        { rank: 3, value: stats.neededForThird }
    ];

    containers.forEach(container => {
        const rankAttr = parseInt(container.getAttribute("data-rank"));
        const needed = neededValues.find(n => n.rank === rankAttr);
        const valueEl = container.querySelector(".avg-value");

        if (!needed || !needed.value || competitor.solves.length !== 4) {
            valueEl.textContent = competitor.solves.length !== 4 ? "" : "x";
            return;
        }

        valueEl.textContent = needed.value === -1 ? "Any" : needed.value.toFixed(2);
    });
}

function renderPersonalBests(side, stats) {
    const singleBox = document.getElementById(`${side}-pb-single`);
    const averageBox = document.getElementById(`${side}-pb-average`);

    singleBox.innerText = stats.personalBestSingle ? stats.personalBestSingle.toFixed(2) : "---";
    averageBox.innerText = stats.personalBestAverage ? stats.personalBestAverage.toFixed(2) : "---";
}