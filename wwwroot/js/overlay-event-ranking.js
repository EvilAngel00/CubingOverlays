class EventRankingOverlay {
    constructor() {
        this.connection = null;
        this.currentRankings = null;
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
            this.renderRankings();
        });

        this.connection.on("RankingsError", (error) => {
            console.error("Rankings error:", error);
        });

        try {
            await this.connection.start();
            console.log("SignalR connected");
            
            // Fetch last sent rankings on connection
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
                this.renderRankings();
            } else {
                console.log("No previous rankings to restore");
            }
        } catch (err) {
            console.error("Error restoring last rankings:", err);
        }
    }

    renderRankings() {
        if (!this.currentRankings || !this.currentRankings.results.length) {
            console.log("No rankings data received");
            return;
        }

        const iconElem = document.getElementById('cubing-icon');
        iconElem.className = 'cubing-icon'; // Reset classes
        iconElem.classList.add(`event-${this.currentRankings.eventId}`);

        const eventLabel = this.getEventName(this.currentRankings.eventName);
        const subtitleLabel = `${eventLabel} - Round ${this.currentRankings.roundNumber}`;
        document.getElementById('competition-title').textContent = subtitleLabel;

        const attemptCount = this.currentRankings.results[0].attempts?.length || 0;

        const rankingsList = document.getElementById('rankings-list');

        rankingsList.style.setProperty('--attempt-count', attemptCount);

        rankingsList.innerHTML = this.currentRankings.results
            .map(result => this.createRankingPill(result, this.currentRankings.eventId))
            .join('');
    }

    createRankingPill(result, eventId) {
        const mainTime = this.getMainDisplayTime(result, eventId);
        const flagCode = (result.person?.country || '--').toLowerCase();
        const competitorName = result.person?.name || 'Unknown';
        const countryName = result.person?.country || '--';

        // Map only the number of attempts we are supposed to have
        const attemptsHTML = result.attempts.map(attempt => `
        <div class="att-cell">
            <span>${this.formatTime(attempt, eventId)}</span>
        </div>
    `).join('');

        return `
        <div class="ranking-pill">
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

    getEventName(eventName) {
        if (eventName === '444bf') {
            return "4x4x4 Blindfolded";
        } else if (eventName === '555bf') {
            return "5x5x5 Blindfolded";
        } else {
            return eventName;
        }
    }

    getMainDisplayTime(result, eventId) {
        const blindfoldEvents = ['333bf', '444bf', '555bf', '333mbf'];
        if (blindfoldEvents.includes(eventId)) {
            return this.formatTime(result.best, eventId);
        } else if (eventId === '333fm') {
            return (result.average / 100).toFixed(2);
        }
        return this.formatTime(result.average, eventId);
    }

    formatTime(value, eventId) {
        if (!value || value <= 0) {
            if (value === -1) return 'DNF';
            return '---';
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

            // Format the TTTTT seconds into mm:ss
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

    formatAttempts(attempts) {
        if (!attempts || !Array.isArray(attempts)) {
            return '---';
        }

        return attempts.map(a => {
            if (a === -1) return 'DNF';
            if (a === -2) return 'DNS';
            if (a === 0) return '---';
            return (a / 100).toFixed(2);
        }).join(', ');
    }
}

const overlay = new EventRankingOverlay();
overlay.init();



