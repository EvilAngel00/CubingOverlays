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

    // Filter out people with no average and sort
    const ranked = state.competitors
        .filter(c => c.stats.average !== null)
        .sort((a, b) => {
            if (a.stats.average === -1) return 1;  // DNF goes to bottom
            if (b.stats.average === -1) return -1; // b is DNF, a is better
            return a.stats.average - b.stats.average; // Lower is better
        });

    const currentFingerprint = ranked
        .map(c => `${c.wcaId}-${c.name}-${c.country}-${c.stats.average}`)
        .join('|');

    // ONLY re-render if something actually changed
    if (currentFingerprint === lastLeaderboardFingerprint) {
        console.log("Leaderboard unchanged. Skipping animation.");
        return;
    }

    // Update the fingerprint for the next check
    lastLeaderboardFingerprint = currentFingerprint;

    listElement.innerHTML = ranked.map((c, index) => {
        const flagCode = (c.country || 'un').toLowerCase();
        const displayAvg = c.stats.average === -1 ? "DNF" : c.stats.average.toFixed(2);

        return `
            <div class="leaderboard-row" style="--delay: ${index * 0.1}s">
                <div class="rank">${index + 1}</div>
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