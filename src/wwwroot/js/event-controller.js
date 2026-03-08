class EventController {
    constructor() {
        this.connection = null;
        this.tiers = ['primary', 'secondary', 'tertiary'];

        this.eventsList = [
            { id: "333", name: "3x3x3" },
            { id: "222", name: "2x2x2" },
            { id: "444", name: "4x4x4" },
            { id: "555", name: "5x5x5" },
            { id: "666", name: "6x6x6" },
            { id: "777", name: "7x7x7" },
            { id: "333bf", name: "3x3x3 Blindfolded" },
            { id: "333fm", name: "3x3x3 Fewest Moves" },
            { id: "333oh", name: "3x3x3 One-Handed" },
            { id: "clock", name: "Clock" },
            { id: "minx", name: "Megaminx" },
            { id: "pyram", name: "Pyraminx" },
            { id: "skewb", name: "Skewb" },
            { id: "sq1", name: "Square-1" },
            { id: "333mbf", name: "3x3x3 Multi-Blind" },
            { id: "444bf", name: "4x4x4 Blindfolded" }, ,
            { id: "555bf", name: "5x5x5 Blindfolded" },
        ];

        this.roundsList = [
            { id: "1", name: "Round 1" },
            { id: "2", name: "Round 2" },
            { id: "3", name: "Round 3" },
            { id: "final", name: "Final" }
        ];
    }

    async initializeSignalR() {
        if (this.connection) return;

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl("/overlayHub")
            .withAutomaticReconnect()
            .build();

        try {
            await this.connection.start();
            console.log("Event Controller SignalR connected");
        } catch (err) {
            console.error("Event Controller SignalR connection failed:", err);
        }
    }

    initDOM() {
        // Populate the dropdowns for all three sections
        this.tiers.forEach(tier => {
            const eventSelect = document.getElementById(`event_${tier}`);
            const roundSelect = document.getElementById(`round_${tier}`);

            this.eventsList.forEach(ev => {
                const option = document.createElement('option');
                option.value = ev.id;
                option.textContent = ev.name;
                eventSelect.appendChild(option);
            });

            this.roundsList.forEach(ro => {
                const option = document.createElement('option');
                option.value = ro.id;
                option.textContent = ro.name;
                roundSelect.appendChild(option);
            });
        });
    }

    clearSection(tier) {
        // Resets the dropdowns to the default empty option
        document.getElementById(`event_${tier}`).value = '';
        document.getElementById(`round_${tier}`).value = '';
    }

    async submitState() {
        // Build the structured JSON with the states of all 3 sections
        const payload = {};

        this.tiers.forEach(tier => {
            payload[tier] = {
                event: document.getElementById(`event_${tier}`).value,
                round: document.getElementById(`round_${tier}`).value
            };
        });

        console.log("Submitting Event Display State:", payload);

        // Ensure SignalR is connected before sending
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
            await this.initializeSignalR();
        }

        try {
            // Note: Update "UpdateEventDisplays" to match the exact method name expected in your C# Hub
            await this.connection.invoke("UpdateEventDisplays", payload);
        } catch (error) {
            console.error("Error submitting event display state:", error);
        }
    }
}

const eventController = new EventController();

// Initialize everything once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    eventController.initDOM();
    eventController.initializeSignalR();
});