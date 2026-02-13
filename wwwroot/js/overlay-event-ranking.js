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
            this.showError(error);
        });

        try {
            await this.connection.start();
            console.log("SignalR connected");
            
            // Fetch last sent rankings on connection
            await this.restoreLastRankings();
        } catch (err) {
            console.error("SignalR connection failed:", err);
            this.showError("Failed to connect to server");
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
        if (!this.currentRankings) {
            this.showError("No rankings data received");
            return;
        }

        const loadingState = document.getElementById('loading-state');
        const rankingsContainer = document.getElementById('rankings-container');
        const errorMessage = document.getElementById('error-message');

        loadingState.classList.add('hidden');
        errorMessage.classList.add('hidden');
        rankingsContainer.classList.remove('hidden');

        // Update titles
        const eventLabel = this.currentRankings.eventName;
        const subtitleLabel = `${eventLabel} - Round ${this.currentRankings.roundNumber}`;
        
        document.getElementById('competition-title').textContent = subtitleLabel;
        document.getElementById('event-subtitle').textContent = `Rankings`;

        // Render table
        const rankingsList = document.getElementById('rankings-list');
        rankingsList.innerHTML = this.currentRankings.results
            .map(result => this.createRankingRow(result))
            .join('');
    }

    createRankingRow(result) {
        const bestTime = this.formatTime(result.best);
        const averageTime = this.formatTime(result.average);
        const attempts = this.formatAttempts(result.attempts);
        const flagCode = (result.person?.country || '--').toLowerCase();
        const medalClass = this.getMedalClass(result.ranking);
        const competitorName = result.person?.name || 'Unknown';
        const wcaId = result.person?.wcaId || '';

        return `
            <tr class="hover:bg-base-200 ${medalClass}">
                <td class="font-bold text-lg text-accent">#${result.ranking}</td>
                <td>
                    <div class="font-semibold">${competitorName}</div>
                    <div class="text-xs opacity-50">${wcaId}</div>
                </td>
                <td>
                    <span class="fi fi-${flagCode} inline-block mr-2"></span>
                    <span>${result.person?.country || '--'}</span>
                </td>
                <td class="text-center font-mono font-bold">${bestTime}</td>
                <td class="text-center font-mono font-bold">${averageTime}</td>
                <td class="text-center text-xs opacity-70">${attempts}</td>
            </tr>
        `;
    }

    getMedalClass(ranking) {
        if (ranking === 1) return 'bg-yellow-500/10';
        if (ranking === 2) return 'bg-gray-400/10';
        if (ranking === 3) return 'bg-orange-700/10';
        return '';
    }

    formatTime(centiseconds) {
        if (!centiseconds || centiseconds <= 0) {
            if (centiseconds === -1) return 'DNF';
            return '---';
        }
        
        const seconds = centiseconds / 100;
        
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

    showError(message) {
        const loadingState = document.getElementById('loading-state');
        const errorMessage = document.getElementById('error-message');
        
        loadingState.classList.add('hidden');
        errorMessage.classList.remove('hidden');
        document.getElementById('error-text').textContent = message;
    }
}

const overlay = new EventRankingOverlay();
overlay.init();



