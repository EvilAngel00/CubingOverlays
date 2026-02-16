import { OverlayCore } from './overlay-core.js';

class LeaderboardOverlay extends OverlayCore {
    constructor() {
        super();
        this.lastFingerprint = "";
        this.state = null;
        this.maxAttemptCount = 0;
    }

    async init() {
        this.connection.on("StateUpdated", state => {
            console.log("StateUpdated");
            console.log("State", state);
            this.state = state;
            this.render(state);
        });
        this.connection.on("RankingsReceived", (filteredRankings) => {
            console.log("Rankings received:", filteredRankings);
            this.competitionName = filteredRankings.competitionName;
        });
        await this.start();

        const res = await fetch("/api/state");
        this.state = await res.json();
        console.log("Fetched State", this.state);

        await this.restoreLastRankings();
        if (this.currentRankings) {
            this.competitionName = this.currentRankings.competitionName;
        }

        this.render(this.state);
    }

    render(state) {
        const compTitleEl = document.getElementById('competition-name');
        if (compTitleEl) compTitleEl.textContent = this.competitionName;

        const listElement = document.getElementById("rankings-list");

        const ranked = state.competitors
            .filter(c => c.stats.currentRank != null)
            .sort((a, b) => a.stats.currentRank - b.stats.currentRank || a.name.localeCompare(b.name));

        // Calculate max attempt count for grid layout
        this.maxAttemptCount = Math.max(
            ...ranked.map(c => c.solves?.length || 0)
        );
        listElement.style.setProperty('--attempt-count', this.maxAttemptCount);

        const fingerprint = ranked.map(c => `${c.wcaId}-${c.stats.average}`).join('|');
        if (fingerprint === this.lastFingerprint) return;
        this.lastFingerprint = fingerprint;

        listElement.innerHTML = ranked.map((c, i) => this.createPill(c, i, ranked)).join('');

        const items = listElement.querySelectorAll('.ranking-pill');
        items.forEach((item, index) => {
            item.style.animationDelay = `${index * 50}ms`;
        });
    }

    createPill(c, index, ranked) {
        const flag = (c.country || '--').toLowerCase();
        const displayAvg = (c.stats.average === -1) ? "DNF" : c.stats.average.toFixed(2);

        const paddedAttempts = Array.from({ length: this.maxAttemptCount }, (_, i) => {
            return (c.solves && c.solves[i] !== undefined) ? (c.solves[i].penalty === 'dnf') ? "DNF" : c.solves[i].time.toFixed(2) : "";
        });

        const attemptsHTML = paddedAttempts.map(attempt => `
            <div class="att-cell">
                <span>${attempt}</span>
            </div>
        `).join('');

        const isTiedWithPrevious = index > 0 && c.stats.currentRank === ranked[index - 1].stats.currentRank;

        return `
            <div class="ranking-pill animate-enter"
                 style="opacity: 0"
                 data-rank="${c.stats.currentRank}" 
                 data-tied="${isTiedWithPrevious}">
                <div class="ranking-position">${c.stats.currentRank}</div>
                <div class="ranking-competitor">
                    <div class="ranking-left">
                        <div class="flag-wrapper">
                            <img src="https://flagcdn.com/h60/${flag}.png"
                                 alt="${c.country || '--'}"
                                 onerror="this.style.display='none'; this.parentElement.classList.add('flag-error');">
                        </div>
                        <div class="ranking-competitor-name" title="${c.name}">${c.name}</div>
                    </div>
                    <div class="ranking-stats-grid">
                        ${attemptsHTML}
                        <div class="avg-cell">${displayAvg}</div>
                    </div>
                </div>
            </div>`;
    }
}

new LeaderboardOverlay().init();