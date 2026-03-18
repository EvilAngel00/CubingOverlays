import { OverlayCore } from './overlay-core.js';

class EventsOverlay extends OverlayCore {
    constructor() {
        super();
        this.currentSettings = null;
        this.eventMap = {
            "333": "3x3x3",
            "222": "2x2x2",
            "444": "4x4x4",
            "555": "5x5x5",
            "666": "6x6x6",
            "777": "7x7x7",
            "333bf": "3x3x3 Blindfolded",
            "333fm": "3x3x3 Fewest Moves",
            "333oh": "3x3x3 One-Handed",
            "clock": "Clock",
            "minx": "Megaminx",
            "pyram": "Pyraminx",
            "skewb": "Skewb",
            "sq1": "Square-1",
            "333mbf": "3x3x3 Multi-Blind",
            "444bf": "4x4x4 Blindfolded",
            "555bf": "5x5x5 Blindfolded"
        };
    }

    async init() {
        await this.initializeSignalR();
        await this.start();

        try {
            // Fetch state from C# on load
            const settings = await this.connection.invoke("GetDisplaySettings");
            this.applySettings(settings);

            const state = await this.connection.invoke("GetEventDisplays");
            this.updateUI(state);
        } catch (err) {
            console.error("Failed to get initial state:", err);
        }
    }

    async initializeSignalR() {
        this.connection.on("SettingsUpdated", (settings) => {
            console.log("SettingsUpdated", settings);
            this.applySettings(settings);
        });

        this.connection.on("EventDisplaysUpdated", (state) => {
            this.updateUI(state);
        });
    }

    applySettings(settings) {
        if (!settings || !settings.eventDisplay) return;
        this.currentSettings = settings.eventDisplay;

        // Apply colors to existing slots immediately
        this.updateSlotColor('slot-primary', this.currentSettings.primaryColor);
        this.updateSlotColor('slot-secondary', this.currentSettings.secondaryColor);
        this.updateSlotColor('slot-tertiary', this.currentSettings.tertiaryColor);
    }

    updateSlotColor(elementId, color) {
        const row = document.getElementById(elementId);
        if (row) {
            // We set a CSS variable on the row, which our CSS will use
            row.style.setProperty('--slot-text-color', color);
        }
    }

    updateUI(state) {
        if (!state) return;
        this.renderSlot('slot-primary', state.primary);
        this.renderSlot('slot-secondary', state.secondary);
        this.renderSlot('slot-tertiary', state.tertiary);
    }

    renderSlot(elementId, data) {
        const row = document.getElementById(elementId);
        const hasData = data && data.event && data.event.trim() !== "";

        if (!hasData) {
            row.classList.add('hidden');
            return;
        }

        const nameEl = row.querySelector('.event-full-name');
        const roundEl = row.querySelector('.event-round-label');
        const groupEl = row.querySelector('.event-group-label');
        const logoContainer = row.querySelector('.event-logo-container');

        // Update Text Content
        nameEl.textContent = this.eventMap[data.event] || data.event;

        // Update round label
        if (data.round) {
            roundEl.textContent = data.round === 'final' ? 'Final' : `Round ${data.round}`;
        } else {
            roundEl.textContent = '';
        }

        // Update group label
        if (data.group) {
            groupEl.textContent = `Group ${data.group}`;
        } else {
            groupEl.textContent = '';
        }

        // Update Logo using a Mask instead of a direct <img>
        const iconPath = `icons/${data.event}.svg`;
        logoContainer.innerHTML = `
        <div class="event-icon-mask" 
             style="mask-image: url('${iconPath}'); -webkit-mask-image: url('${iconPath}');">
        </div>`;

        row.classList.remove('hidden');
    }
}

const overlay = new EventsOverlay();
overlay.init();