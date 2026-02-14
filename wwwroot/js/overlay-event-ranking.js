class EventRankingOverlay {
    constructor() {
        this.connection = null;
        this.currentRankings = null;

        this.paginationTimer = null;
        this.currentIndex = 0;
        this.pageSize = 20;
        this.loopDelay = 8000; // milliseconds
    }

    init() {
        this.initializeSignalR();
    }

    async initializeSignalR() {
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl("/overlayHub")
            .withAutomaticReconnect()
            .build();

        this.connection.on("RankingsReceived", (filteredRankings) => {
            console.log("Rankings received:", filteredRankings);
            this.currentRankings = filteredRankings;
            this.startPresentation();
        });

        this.connection.on("RankingsError", (error) => {
            console.error("Rankings error:", error);
        });

        try {
            await this.connection.start();
            console.log("SignalR connected");
            await this.restoreLastRankings();
        } catch (err) {
            console.error("SignalR connection failed:", err);
        }
    }

    async restoreLastRankings() {
        try {
            const lastRankings = await this.connection.invoke("GetLastRankings");
            if (lastRankings) {
                console.log("Restored last rankings:", lastRankings);
                this.currentRankings = lastRankings;
                this.startPresentation();
            } else {
                console.log("No previous rankings to restore");
            }
        } catch (err) {
            console.error("Error restoring last rankings:", err);
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

        const eventLabel = this.getEventName(this.currentRankings.eventName);
        const subtitleLabel = `${eventLabel} - Round ${this.currentRankings.roundNumber}`;
        document.getElementById('competition-title').textContent = subtitleLabel;

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
        const mainTime = this.getMainDisplayTime(result, eventId);
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
            <div class="ranking-pill animate-enter" style="opacity: 0"> <div class="ranking-position">${result.ranking}</div>
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

    getEventName(eventName) {
        if (eventName === '444bf') return "4x4x4 Blindfolded";
        if (eventName === '555bf') return "5x5x5 Blindfolded";
        return eventName;
    }

    getMainDisplayTime(result, eventId) {
        const blindfoldEvents = ['333bf', '444bf', '555bf', '333mbf'];
        if (blindfoldEvents.includes(eventId)) {
            return this.formatTime(result.best, eventId);
        } else if (eventId === '333fm') {
            if (!result.average || result.average <= 0) {
                if (result.average === -1) return 'DNF';
                if (result.average === -2) return 'DNS';
                return '';
            }
            return (result.average / 100).toFixed(2);
        }
        return this.formatTime(result.average, eventId);
    }

    formatTime(value, eventId) {
        if (!value || value <= 0) {
            if (value === -1) return 'DNF';
            if (value === -2) return 'DNS';
            return '';
        }

        if (eventId === "333mbf") {
            const str = value.toString().padStart(10, '0');
            const dd = parseInt(str.substring(1, 3));
            const ttttt = parseInt(str.substring(3, 8));
            const mm = parseInt(str.substring(8, 10));

            const difference = 99 - dd;
            const missed = mm;
            const solved = difference + missed;
            const attempted = solved + missed;

            let timeStr = "";
            if (ttttt === 99999) {
                timeStr = "??:??";
            } else {
                const mins = Math.floor(ttttt / 60);
                const secs = ttttt % 60;
                timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
            return `${solved}/${attempted} ${timeStr}`;
        }

        if (eventId === "333fm") {
            return value;
        }

        const seconds = value / 100;

        if (seconds >= 60) {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${minutes}:${secs.toFixed(2).padStart(5, '0')}`;
        }

        return seconds.toFixed(2);
    }
}

const overlay = new EventRankingOverlay();
overlay.init();