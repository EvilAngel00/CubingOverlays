import { getBestSolve } from './utils.js';

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/overlayHub")
    .build();

connection.on("StateUpdated", state => {
    console.log("StateUpdated");
    console.log("State", state);
    renderLeaderboard(state);
});

async function start() {
    try {
        console.log("Start");
        await connection.start();
        const res = await fetch("/api/state");
        const state = await res.json();
        console.log("State", state);
        renderLeaderboard(state);
    } catch (err) {
        console.error("SignalR Connection Error: ", err);
    }
}

start();

let lastLeaderboardFingerprint = "";

function renderLeaderboard(state) {
    const listElement = document.getElementById("leaderboard-list");

    // 1. Filter and Sort
    const ranked = state.competitors
        .filter(c => c.stats.average !== null)
        .sort((a, b) => {
            const avgA = a.stats.average === -1 ? Infinity : a.stats.average;
            const avgB = b.stats.average === -1 ? Infinity : b.stats.average;

            // Primary: Average
            if (avgA !== avgB) return avgA - avgB;

            // Secondary: Best Single
            const bestA = getBestSolve(a.solves);
            const bestB = getBestSolve(b.solves);
            if (bestA !== bestB) return bestA - bestB;

            // Tertiary: First Name (A-Z)
            return a.name.localeCompare(b.name);
        });

    // 2. Fingerprint check (Include best single in case of average ties)
    const currentFingerprint = ranked
        .map(c => `${c.wcaId}-${c.stats.average}-${getBestSolve(c.solves)}`)
        .join('|');

    if (currentFingerprint === lastLeaderboardFingerprint) return;
    lastLeaderboardFingerprint = currentFingerprint;

    // 3. Render HTML
    let actualRank = 1; // Track the competition rank

    listElement.innerHTML = ranked.map((c, index) => {
        const flagCode = (c.country || '--').toLowerCase();
        const displayAvg = c.stats.average === -1 ? "DNF" : c.stats.average.toFixed(2);

        // Determine if tied with previous
        let isTiedWithPrevious = false;
        if (index > 0) {
            const prev = ranked[index - 1];
            const isAvgTie = c.stats.average === prev.stats.average;
            const isBestTie = getBestSolve(c.solves) === getBestSolve(prev.solves);

            if (isAvgTie && isBestTie) {
                isTiedWithPrevious = true;
            } else {
                // If NOT tied, the rank jumps to the current position
                actualRank = index + 1;
            }
        }

        return `
            <div class="leaderboard-row" 
                 data-rank="${actualRank}" 
                 data-tied="${isTiedWithPrevious}" 
                 style="--delay: ${index * 0.1}s">
                <div class="rank">${isTiedWithPrevious ? "" : actualRank}</div>
                <div class="flag-wrapper">
                    <img src="https://flagcdn.com/h60/${flagCode}.png" 
                         onerror="this.style.display='none'; this.parentElement.classList.add('flag-error');">
                </div>
                <div class="name">${c.name}</div>
                <div class="stats">
                    <span class="average-value">${displayAvg}</span>
                </div>
            </div>
        `;
    }).join('');
}