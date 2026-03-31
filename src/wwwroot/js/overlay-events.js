import { OverlayCore } from './overlay-core.js';

class EventsOverlay extends OverlayCore {
    constructor() {
        super();
        this.currentSettings = null;
        this.eventMap = {
            "333": "3x3",
            "222": "2x2",
            "444": "4x4",
            "555": "5x5",
            "666": "6x6",
            "777": "7x7",
            "333bf": "3BLD",
            "333fm": "FMC",
            "333oh": "OH",
            "clock": "Clock",
            "minx": "Megaminx",
            "pyram": "Pyraminx",
            "skewb": "Skewb",
            "sq1": "Square-1",
            "333mbf": "Multiblind",
            "444bf": "4BLD",
            "555bf": "5BLD"
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
        const slot = document.getElementById(elementId);
        const hasEvent = data && data.event && data.event.trim() !== "";
        const hasGroup = data && data.group;

        // Show slot if there's either an event or a group
        if (!hasEvent && !hasGroup) {
            slot.classList.add('hidden');
            return;
        }

        const eventRow = slot.querySelector('.event-row');
        const nameEl = slot.querySelector('.event-full-name');
        const roundEl = slot.querySelector('.event-round-label');
        const groupEl = slot.querySelector('.event-group-label');
        const logoContainer = slot.querySelector('.event-logo-container');

        // Handle event row visibility and content
        if (hasEvent) {
            eventRow.style.visibility = 'visible';

            // Update Text Content
            nameEl.textContent = this.eventMap[data.event] || data.event;

            // Update round label
            if (data.round) {
                roundEl.textContent = data.round === 'final' ? 'Finale' : `Round ${data.round}`;
            } else {
                roundEl.textContent = '';
            }

            // Update Logo using a Mask instead of a direct <img>
            const iconPath = `icons/${data.event}.svg`;
            logoContainer.innerHTML = `
            <div class="event-icon-mask" 
                 style="mask-image: url('${iconPath}'); -webkit-mask-image: url('${iconPath}');">
            </div>`;
        } else {
            eventRow.style.visibility = 'hidden';
        }

        // Update group label - always show if present
        if (hasGroup) {
            groupEl.textContent = `Groupe ${data.group}`;
        } else {
            groupEl.textContent = '';
        }

        slot.classList.remove('hidden');
    }
}

const overlay = new EventsOverlay();
overlay.init();