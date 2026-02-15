import { OverlayCore } from './overlay-core.js';

class EventRankingOverlay extends OverlayCore {
    constructor() {
        super();
        this.currentRankings = null;

        this.paginationTimer = null;
        this.currentIndex = 0;
    }

    async init() {
        await this.initializeSignalR();
        await this.start();

        try {
            const settings = await this.connection.invoke("GetDisplaySettings");
            this.applySettings(settings, false); // apply without restarting presentation yet

            await this.restoreLastRankings();
            this.startPresentation();
        } catch (err) {
            console.error("SignalR connection failed:", err);
        }
    }

    async initializeSignalR() {
        this.connection.on("SettingsUpdated", (settings) => {
            console.log("Settings updated from server:", settings);
            this.applySettings(settings);
        });

        this.connection.on("RankingsReceived", (filteredRankings) => {
            console.log("Rankings received:", filteredRankings);
            this.currentRankings = filteredRankings;
            this.startPresentation();
        });

        this.connection.on("RankingsError", (error) => {
            console.error("Rankings error:", error);
        });
    }

    applySettings(settings, restartIfActive = true) {
        if (!settings || !settings.eventRanking) return;

        const { pageDuration, pageSize } = settings.eventRanking;

        // Convert seconds to milliseconds
        this.loopDelay = pageDuration * 1000;
        this.pageSize = pageSize;

        console.log(`Applied Settings: Size=${this.pageSize}, Delay=${this.loopDelay}ms`);

        // If we are currently showing rankings, restart the loop to apply new page size/speed
        if (restartIfActive && this.currentRankings) {
            this.startPresentation();
        }
    }

    startPresentation() {
        if (!this.currentRankings || !this.currentRankings.results.length) {
            console.log("No rankings data to present");
            return;
        }

        this.stopPagination();

        this.currentIndex = 0;

        this.updateHeaderUI();
        this.renderBatch(true); // true = animate header too

        if (this.currentRankings.results.length > this.pageSize) {
            this.paginationTimer = setInterval(() => {
                this.nextPage();
            }, this.loopDelay);
        }
    }

    stopPagination() {
        if (this.paginationTimer) {
            clearInterval(this.paginationTimer);
            this.paginationTimer = null;
        }
    }

    updateHeaderUI() {
        const iconContainer = document.getElementById('cubing-icon');
        const eventId = this.currentRankings.eventId;

        iconContainer.innerHTML = `
            <img src="icons/${eventId}.svg" 
                 class="event-svg" 
                 alt="${eventId}">`;

        // Get strings
        const eventLabel = this.currentRankings.eventName;
        const competitionName = this.currentRankings.competitionName || 'Competition Name';
        const roundLabel = `Round ${this.currentRankings.roundNumber}`;

        // Update the two separate lines
        // Note: Make sure you updated the ID in HTML to 'competition-name' 
        // If you kept it as 'competition-title', change the ID below.
        const compTitleEl = document.getElementById('competition-name');
        const subTitleEl = document.getElementById('event-round-info');

        if (compTitleEl) compTitleEl.textContent = competitionName;
        if (subTitleEl) subTitleEl.textContent = `${eventLabel} - ${roundLabel}`;

        this.maxAttemptCount = Math.max(
            ...this.currentRankings.results.map(r => r.attempts?.length || 0)
        );

        document.getElementById('rankings-list').style.setProperty('--attempt-count', this.maxAttemptCount);
    }

    nextPage() {
        this.currentIndex += this.pageSize;

        if (this.currentIndex >= this.currentRankings.results.length) {
            this.currentIndex = 0;
        }

        this.renderBatch(false);
    }

    renderBatch(animateHeader = false) {
        const header = document.querySelector('header');
        const rankingsList = document.getElementById('rankings-list');

        if (animateHeader) {
            // Reset animation
            header.classList.remove('animate-enter');
            void header.offsetWidth; // Trigger reflow to restart animation
            header.classList.add('animate-enter');
            header.style.animationDelay = '0ms';
        }

        const batchData = this.currentRankings.results.slice(
            this.currentIndex,
            this.currentIndex + this.pageSize
        );

        rankingsList.innerHTML = batchData
            .map(result => this.createRankingPill(result, this.currentRankings.eventId))
            .join('');

        const items = rankingsList.querySelectorAll('.ranking-pill');
        let baseDelay = animateHeader ? 200 : 0; // If header is animating, wait a bit before list starts

        items.forEach((item, index) => {
            item.classList.add('animate-enter');
            // Stagger each item by 50ms
            item.style.animationDelay = `${baseDelay + (index * 50)}ms`;
        });
    }

    createRankingPill(result, eventId) {
        const format = this.currentRankings.format || '';
        const mainTime = this.getMainDisplayTime(result, eventId, format);
        const flagCode = (result.person?.country || '--').toLowerCase();
        const competitorName = result.person?.name || 'Unknown';
        const countryName = result.person?.country || '--';

        const paddedAttempts = Array.from({ length: this.maxAttemptCount }, (_, i) => {
            return (result.attempts && result.attempts[i] !== undefined) ? result.attempts[i] : 0;
        });

        const attemptsHTML = paddedAttempts.map(attempt => `
            <div class="att-cell">
                <span>${this.formatTime(attempt, eventId)}</span>
            </div>
        `).join('');

        return `
            <div class="ranking-pill animate-enter" style="opacity: 0">
                <div class="ranking-position">${result.ranking}</div>
                <div class="ranking-competitor">
                    <div class="ranking-left">
                        <div class="flag-wrapper">
                            <img src="https://flagcdn.com/h60/${flagCode}.png" 
                                 alt="${countryName}"
                                 onerror="this.style.display='none'; this.parentElement.classList.add('flag-error');">
                        </div>
                        <div class="ranking-competitor-name" title="${competitorName}">${competitorName}</div>
                    </div>

                    <div class="ranking-stats-grid">
                        ${attemptsHTML}
                        <div class="avg-cell">${mainTime}</div>
                    </div>
                </div>
            </div>
        `;
    }
}

const overlay = new EventRankingOverlay();
overlay.init();