class RankingController {
    constructor() {
        this.competitionId = '';
        this.currentData = null;
        this.connection = null;
    }

    async initializeSignalR() {
        if (this.connection) return;

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl("/overlayHub")
            .withAutomaticReconnect()
            .build();

        this.connection.on("CacheCompetitionData", (data, competitionId) => {
            console.log("Competition data cached on server");
        });

        this.connection.on("RankingsReceived", (filteredRankings) => {
            console.log("Rankings received via SignalR", filteredRankings);
        });

        this.connection.on("RankingsError", (error) => {
            console.error("Rankings error:", error);
            this.showError(error);
        });

        try {
            await this.connection.start();
            console.log("SignalR connected");
        } catch (err) {
            console.error("SignalR connection failed:", err);
        }
    }

    async fetchCompetitionData() {
        const competitionId = document.getElementById('competition_id_input').value.trim();
        
        if (!competitionId) {
            this.showError('Please enter a competition ID');
            return false;
        }

        this.competitionId = competitionId;
        this.showLoading(true);
        this.hideError();

        try {
            const response = await fetch(`/api/rankings/${encodeURIComponent(competitionId)}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    this.showError('Competition not found. Check the ID and try again.');
                } else {
                    this.showError('Failed to fetch competition data. Please try again.');
                }
                this.showLoading(false);
                return false;
            }

            const data = await response.json();
            this.currentData = data;
            this.populateEventSelect(data);
            this.showLoading(false);
            document.getElementById('events_section').classList.remove('hidden');
            return true;
        } catch (error) {
            console.error('Error fetching competition:', error);
            this.showError('Error loading competition data. Please check the ID.');
            this.showLoading(false);
            return false;
        }
    }

    populateEventSelect(data) {
        const eventSelect = document.getElementById('event_select');
        const eventList = this.extractUniqueEvents(data);
        
        // Clear existing options except the first placeholder
        while (eventSelect.options.length > 1) {
            eventSelect.remove(1);
        }
        
        if (eventList.length > 0) {
            eventList.forEach(event => {
                const option = document.createElement('option');
                option.value = event.id;
                option.textContent = event.name;
                eventSelect.appendChild(option);
            });
        }
    }

    updateRounds() {
        const selectedEventId = document.getElementById('event_select').value;
        
        if (!selectedEventId) {
            document.getElementById('rounds_section').classList.add('hidden');
            this.disableViewButton();
            return;
        }

        // Find the selected event
        const selectedEvent = this.currentData.events.find(e => e.eventId === selectedEventId);
        
        if (!selectedEvent) {
            document.getElementById('rounds_section').classList.add('hidden');
            this.disableViewButton();
            return;
        }

        // Populate round select
        const roundSelect = document.getElementById('round_select');
        while (roundSelect.options.length > 1) {
            roundSelect.remove(1);
        }

        selectedEvent.rounds
            .sort((a, b) => a.number - b.number)
            .forEach(round => {
            const option = document.createElement('option');
            option.value = round.number;
            option.textContent = `Round ${round.number}`;
            roundSelect.appendChild(option);
        });

        // Show rounds section and reset selection
        document.getElementById('rounds_section').classList.remove('hidden');
        roundSelect.value = '';
        this.disableViewButton();
    }

    enableViewButton() {
        const viewBtn = document.getElementById('openRankingBtn');
        viewBtn.disabled = false;
    }

    disableViewButton() {
        const viewBtn = document.getElementById('openRankingBtn');
        viewBtn.disabled = true;
    }

    extractUniqueEvents(data) {
        const eventsMap = new Map();
        
        if (data.events && Array.isArray(data.events)) {
            data.events.forEach(event => {
                if (event.eventId) {
                    eventsMap.set(event.eventId, {
                        id: event.eventId,
                        name: this.getEventName(event.eventId)
                    });
                }
            });
        }
        
        return Array.from(eventsMap.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
        );
    }

    getEventName(eventId) {
        const eventNames = {
            '333': '3x3x3 Cube',
            '222': '2x2x2 Cube',
            '444': '4x4x4 Cube',
            '555': '5x5x5 Cube',
            '666': '6x6x6 Cube',
            '777': '7x7x7 Cube',
            '333bf': '3x3x3 Blindfolded',
            '333fm': '3x3x3 Fewest Moves',
            '333oh': '3x3x3 One-Handed',
            'clock': 'Clock',
            'minx': 'Megaminx',
            'pyram': 'Pyraminx',
            'skewb': 'Skewb',
            'sq1': 'Square-1',
            '333mbf': '3x3x3 Multi-Blind',
            '444bf': '4x4x4 Blindfolded',
            '555bf': '5x5x5 Blindfolded'
        };
        return eventNames[eventId] || eventId;
    }

    showError(message) {
        const helpText = document.getElementById('ranking_help_text');
        helpText.textContent = message;
        helpText.classList.remove('opacity-0');
    }

    hideError() {
        const helpText = document.getElementById('ranking_help_text');
        helpText.classList.add('opacity-0');
    }

    showLoading(show) {
        const loadingState = document.getElementById('loading_state');
        if (show) {
            loadingState.classList.remove('hidden');
        } else {
            loadingState.classList.add('hidden');
        }
    }

    async updateRanking() {
        const selectedEvent = document.getElementById('event_select').value;
        const selectedRound = document.getElementById('round_select').value;

        if (!selectedEvent || !selectedRound) {
            this.showError('Please select both an event and a round');
            return;
        }

        // Initialize SignalR if not already done
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            await this.initializeSignalR();
        }

        // Send the request via SignalR
        await this.connection.invoke("RequestRankings", this.competitionId, selectedEvent, parseInt(selectedRound));
    }
}

const rankingController = new RankingController();

// Event listener for round selection to enable view button
document.addEventListener('DOMContentLoaded', () => {
    const roundSelect = document.getElementById('round_select');
    roundSelect.addEventListener('change', () => {
        const selectedEvent = document.getElementById('event_select').value;
        const selectedRound = roundSelect.value;
        
        if (selectedEvent && selectedRound) {
            rankingController.enableViewButton();
        } else {
            rankingController.disableViewButton();
        }
    });
});

// Event listener for Enter key on competition ID input
document.getElementById('competition_id_input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        rankingController.fetchCompetitionData();
    }
});



