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

    const ranked = state.competitors
        .filter(c => c.stats.currentRank !== null && c.stats.currentRank !== undefined)
        .sort((a, b) => {
            if (a.stats.currentRank !== b.stats.currentRank) return a.stats.currentRank - b.stats.currentRank;
            return a.name.localeCompare(b.name);
        });

    const currentFingerprint = ranked
        .map(c => `${c.wcaId}-${c.stats.currentRank}-${c.stats.average}`)
        .join('|');

    if (currentFingerprint === lastLeaderboardFingerprint) return;
    lastLeaderboardFingerprint = currentFingerprint;

    listElement.innerHTML = ranked.map((c, index) => {
        const flagCode = (c.country || '--').toLowerCase();
        const displayAvg = c.stats.average === -1 ? "DNF" : c.stats.average.toFixed(2);

        const isTiedWithPrevious = index > 0 && c.stats.currentRank === ranked[index - 1].stats.currentRank;

        return `
            <div class="leaderboard-row" 
                 data-rank="${c.stats.currentRank}" 
                 data-tied="${isTiedWithPrevious}" 
                 style="--delay: ${index * 0.1}s">
                <div class="rank">
                    ${isTiedWithPrevious ? "" : c.stats.currentRank}
                </div>
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