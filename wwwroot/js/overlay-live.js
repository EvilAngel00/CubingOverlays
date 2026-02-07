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
        avgRankBox.textContent = getOrdinal(calculateProjectedRank(stats.average, competitorId, state.competitors));
    }
    else if (stats.bestPossibleAverage !== null) {
        // Show Projections
        projGroup.classList.remove("hidden-stat");
        projGroup.classList.add("visible-stat");

        bpaVal.textContent = stats.bestPossibleAverage === -1 ? "DNF" : stats.bestPossibleAverage.toFixed(2);
        bpaRankBox.textContent = getOrdinal(calculateProjectedBPARank(stats.bestPossibleAverage, competitorId, state.competitors));

        wpaVal.textContent = stats.worstPossibleAverage === -1 ? "DNF" : stats.worstPossibleAverage.toFixed(2);
        wpaRankBox.textContent = getOrdinal(calculateProjectedWPARank(stats.worstPossibleAverage, competitorId, state.competitors));
    }

    const neededContainer = root.querySelector(".avg-container.needed");
    const neededLabel = neededContainer.querySelector(".avg-label");
    const neededValueBox = neededContainer.querySelector(".avg-value");
    const neededValueContainer = neededContainer.querySelector(".avg-value-box");

    // 1. Try for 1st Place (Rank 1)
    let neededValue = calculateNeededForRank(competitor, state.competitors, 1);
    let labelText = "For 1st";
    let isPodiumFallback = false;

    // 2. If 1st is impossible ("N/A"), try for Podium (Rank 3)
    if (neededValue === "N/A") {
        const neededForPodium = calculateNeededForRank(competitor, state.competitors, 3);

        if (neededForPodium !== "N/A" && neededForPodium !== null) {
            neededValue = neededForPodium;
            labelText = "For Podium";
            isPodiumFallback = true;
        } else {
            // If Podium is also impossible, hide the box
            neededValue = null;
        }
    }

    // 3. Render
    if (!neededValue) {
        neededContainer.classList.add("hidden-stat");
    } else {
        neededContainer.classList.remove("hidden-stat");
        neededLabel.textContent = labelText;
        neededValueBox.textContent = neededValue;

        // Visual distinction: Change color to Bronze if it's for Podium
        if (isPodiumFallback) {
            neededLabel.style.backgroundColor = "#cd7f32";
            neededLabel.style.color = "white";
            neededValueContainer.style.borderColor = "#cd7f32";
        } else {
            // Reset to Gold (default CSS)
            neededLabel.style.backgroundColor = "";
            neededLabel.style.color = "";
            neededValueContainer.style.borderColor = "";
            neededValueContainer.style.background = "";
        }
    }

    const pbSingleValueBox = document.getElementById(`${side}-pb-single`);
    pbSingleValueBox.innerText = competitor.stats.personalBestSingle ? competitor.stats.personalBestSingle.toFixed(2) : "---";

    const pbAverageValueBox = document.getElementById(`${side}-pb-average`);
    pbAverageValueBox.innerText = competitor.stats.personalBestAverage ? competitor.stats.personalBestAverage.toFixed(2) : "---";
}

function calculateProjectedRank(targetAvg, currentId, allCompetitors) {
    if (targetAvg === null) return null;

    const me = allCompetitors.find(c => c.wcaId === currentId);
    const myBest = getBestSolve(me.solves);
    const myAvg = targetAvg === -1 ? Infinity : targetAvg;

    let betterCount = 0;

    allCompetitors.forEach(opp => {
        // Skip self and people who haven't finished an average
        if (opp.wcaId === currentId || opp.stats.average === null) return;

        const oppAvg = opp.stats.average === -1 ? Infinity : opp.stats.average;
        const oppBest = getBestSolve(opp.solves);

        // 1. Check Average (Primary)
        if (oppAvg < myAvg) {
            betterCount++;
        }
        // 2. Check Single (Tie-breaker)
        else if (oppAvg === myAvg) {
            if (oppBest < myBest) {
                betterCount++;
            }
        }
    });

    return betterCount + 1;
}

function calculateProjectedBPARank(targetBPA, currentId, allCompetitors) {
    if (targetBPA === null) return null;

    let betterCount = 0;
    const myBestIfZero = 0.00; // Best possible single scenario

    allCompetitors.forEach(opp => {
        if (opp.wcaId === currentId || opp.stats.average === null) return;

        const oppAvg = opp.stats.average === -1 ? Infinity : opp.stats.average;
        const myAvg = targetBPA === -1 ? Infinity : targetBPA;

        // Opponent is better if:
        // 1. Their average is strictly lower
        // 2. Their average is tied, but their best single is better than 0.00 (Impossible)
        if (oppAvg < myAvg) {
            betterCount++;
        }
        else if (oppAvg === myAvg) {
            // Since we assume we got a 0.00, we win every tie-break 
            // unless the opponent also has a 0.00.
            if (getBestSolve(opp.solves) < myBestIfZero) {
                betterCount++;
            }
        }
    });

    return betterCount + 1;
}

function calculateProjectedWPARank(targetWPA, currentId, allCompetitors) {
    if (targetWPA === null) return null;

    let betterCount = 0;

    allCompetitors.forEach(opp => {
        if (opp.wcaId === currentId || opp.stats.average === null) return;

        const oppAvg = opp.stats.average === -1 ? Infinity : opp.stats.average;
        const myAvg = targetWPA === -1 ? Infinity : targetWPA;

        if (oppAvg < myAvg) {
            betterCount++;
        }
        else if (oppAvg === myAvg) {
            // In the worst case, we keep our current best.
            // If the opponent's best is lower than ours, they beat us on the tie-break.
            if (getBestSolve(opp.solves) < getBestSolve(allCompetitors.find(c => c.wcaId === currentId).solves)) {
                betterCount++;
            }
        }
    });

    return betterCount + 1;
}

function calculateNeededForRank(competitor, allCompetitors, targetRank) {
    // 1. Validation
    const currentSolves = competitor.solves
        .filter(s => s.time !== null)
        .map(s => (s.penalty === "dnf" ? Infinity : s.time));

    if (currentSolves.length !== 4) return null;

    // 2. Identify the "Target Competitor" to beat
    // Filter strictly for valid averages and sort them
    const validCompetitors = allCompetitors
        .filter(c => c.wcaId !== competitor.wcaId && c.stats.average !== null && c.stats.average !== -1)
        .sort((a, b) => a.stats.average - b.stats.average);

    // If checking for 1st, we need validCompetitors[0]
    // If checking for 3rd, we need validCompetitors[2]
    const targetCompetitor = validCompetitors[targetRank - 1];

    // If the slot is empty (e.g., aiming for 3rd but only 2 people finished), 
    // simply finishing the average guarantees the spot.
    if (!targetCompetitor) return "Any";

    // 3. Get Target Stats
    const L_avg = targetCompetitor.stats.average;
    const L_best = getBestSolve(targetCompetitor.solves);

    // 4. Ao5 Setup
    const v = [...currentSolves].sort((a, b) => a - b);
    const targetSum = Math.round(L_avg * 3 * 100) / 100;

    // Helper to check if a specific time X wins/ties the target rank
    function checkTime(X) {
        const allFive = [...currentSolves, X].sort((a, b) => a - b);
        const sumMiddle = allFive[1] + allFive[2] + allFive[3];
        const myAvg = Math.round((sumMiddle / 3) * 100) / 100;
        const myBest = allFive[0]; // Best single in the set

        if (myAvg < L_avg) return true;
        if (myAvg === L_avg && myBest <= L_best) return true;
        return false;
    }

    // 5. Scenarios
    if (checkTime(Infinity)) return "Any";
    if (!checkTime(0.00)) return "N/A";

    // 6. Calculate Max Time X
    // We assume X will be one of the middle three solves or better.
    // Formula: (v[1] + v[2] + X) / 3 <= L_avg
    let xWin = targetSum - v[1] - v[2];

    // Tie-break Logic
    const myBestWithX = Math.min(v[0], xWin);
    if (myBestWithX >= L_best) {
        // If we lose/tie the best-single tie-break, we must strictly beat the average.
        // We lower the target sum by 0.01s (since times are 2 decimals).
        // (targetSum - 0.01) - v[1] - v[2]
        xWin = (targetSum - 0.01) - v[1] - v[2];
    }

    // Floating point cleanup & final check
    xWin = Math.round(xWin * 100) / 100;

    return xWin >= 0 ? xWin.toFixed(2) : "N/A";
}
