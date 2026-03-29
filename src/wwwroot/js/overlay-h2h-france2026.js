import { getOrdinal, formatSolve } from './utils.js';

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/overlayHub")
    .build();

var settings = null;

connection.on("StateUpdated", state => {
    console.log("StateUpdated");
    console.log("State", state);
    renderSide("left", state.round.leftCompetitorWcaId, state);
    renderSide("right", state.round.rightCompetitorWcaId, state);
});

connection.on("SettingsUpdated", (updatedSettings) => {
    console.log("Settings updated from server:", updatedSettings);
    applySettings(updatedSettings);
});

async function start() {
    console.log("Start");
    await connection.start();
    const res = await fetch("/api/state");
    const state = await res.json();
    console.log("State", state);

    const settings = await connection.invoke("GetDisplaySettings");
    applySettings(settings);

    renderSide("left", state.round.leftCompetitorWcaId, state);
    renderSide("right", state.round.rightCompetitorWcaId, state);
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

    const leftName = document.querySelector("#left .name");
    const rightName = document.querySelector("#right .name");

    if (leftName && leftPlayerColor) {
        leftName.style.color = leftPlayerColor;
    }

    if (rightName && rightPlayerColor) {
        rightName.style.color = rightPlayerColor;
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
        el.classList.add("visible-stat");
    });

    root.querySelector(".main-avg .avg-value").textContent = "";
    root.querySelector(".main-avg .rank-box").textContent = "";
    root.querySelector(".bpa .avg-value").textContent = "";
    root.querySelector(".bpa .rank-box").textContent = "";
    root.querySelector(".wpa .avg-value").textContent = "";
    root.querySelector(".wpa .rank-box").textContent = "";

    if (stats.average !== null) {
        // Final average is available
        root.querySelector(".main-avg .avg-value").textContent = stats.average === -1 ? "DNF" : stats.average.toFixed(2);
        root.querySelector(".main-avg .rank-box").textContent = stats.currentRank;
    }
    else if (stats.bestPossibleAverage !== null) {
        // Show projections instead
        root.querySelector(".bpa .avg-value").textContent = stats.bestPossibleAverage === -1 ? "DNF" : stats.bestPossibleAverage.toFixed(2);
        root.querySelector(".bpa .rank-box").textContent = stats.bestPossibleRank;

        root.querySelector(".wpa .avg-value").textContent = stats.worstPossibleAverage === -1 ? "DNF" : stats.worstPossibleAverage.toFixed(2);
        root.querySelector(".wpa .rank-box").textContent = stats.worstPossibleRank;
    }
}

function renderNeededFor(root, competitor) {
    const containers = root.querySelectorAll(".avg-container.needed");
    const stats = competitor.stats;

    const neededValues = [
        { rank: 1, value: stats.neededForFirst, label: "For 1st" },
        { rank: 2, value: stats.neededForSecond, label: "For 2nd" },
        { rank: 3, value: stats.neededForThird, label: "For 3rd" }
    ];

    containers.forEach(container => {
        const rankAttr = parseInt(container.getAttribute("data-rank"));
        const needed = neededValues.find(n => n.rank === rankAttr);

        const valueBox = container.querySelector(".avg-value");

        if (!needed || !needed.value || competitor.solves.length !== 4) {
            if (competitor.solves.length !== 4) {
                valueBox.textContent = "";
                return;
            }
            else { 
                valueBox.textContent = "x";
                return;
            }
        }

        valueBox.textContent = needed.value === -1 ? "Any" : needed.value.toFixed(2);

        let color = "";
        let fontColor = "";
        switch (rankAttr) {
            case 1: 
                fontColor = "white"; 
                color = ""; // Default(Gold)
                break;
            case 2: 
                fontColor = "white"; 
                color = "#c0c0c0"; // Silver
                break;
            case 3: 
                fontColor = "white"; 
                color = "#cd7f32"; // Bronze
                break;
        }

        const label = container.querySelector(".avg-label");
        const valueWrapper = container.querySelector(".avg-value-box");
        label.style.backgroundColor = color;
        label.style.color = fontColor;
        valueWrapper.style.borderColor = color;
    });
}

function renderPersonalBests(side, stats) {
    const singleBox = document.getElementById(`${side}-pb-single`);
    const averageBox = document.getElementById(`${side}-pb-average`);

    singleBox.innerText = stats.personalBestSingle ? stats.personalBestSingle.toFixed(2) : "---";
    averageBox.innerText = stats.personalBestAverage ? stats.personalBestAverage.toFixed(2) : "---";
}