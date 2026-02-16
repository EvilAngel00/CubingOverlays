class SettingsController {
    constructor() {
        this.connection = null;
        this.inputs = {
            loopDuration: document.getElementById('loopDuration'),
            pageSize: document.getElementById('pageSize'),
            leftPlayerColor: document.getElementById('leftPlayerColor'),
            leftPlayerColorText: document.getElementById('leftPlayerColorText'),
            rightPlayerColor: document.getElementById('rightPlayerColor'),
            rightPlayerColorText: document.getElementById('rightPlayerColorText')
        };
    }

    async init() {
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl("/overlayHub")
            .withAutomaticReconnect()
            .build();

        try {
            await this.connection.start();
            console.log("SignalR Connected");

            // Get initial settings
            const settings = await this.connection.invoke("GetDisplaySettings");
            this.populateForm(settings);

        } catch (err) {
            console.error("SignalR Connection Error: ", err);
        }

        // Set up color synchronization
        this.setupColorSync();
    }

    setupColorSync() {
        // Left player color sync
        this.inputs.leftPlayerColor.addEventListener('input', (e) => {
            this.inputs.leftPlayerColorText.value = e.target.value;
        });

        this.inputs.leftPlayerColorText.addEventListener('input', (e) => {
            if (this.isValidHexColor(e.target.value)) {
                this.inputs.leftPlayerColor.value = e.target.value;
            }
        });

        // Right player color sync
        this.inputs.rightPlayerColor.addEventListener('input', (e) => {
            this.inputs.rightPlayerColorText.value = e.target.value;
        });

        this.inputs.rightPlayerColorText.addEventListener('input', (e) => {
            if (this.isValidHexColor(e.target.value)) {
                this.inputs.rightPlayerColor.value = e.target.value;
            }
        });
    }

    isValidHexColor(value) {
        // Check if value is a valid hex color (with or without #)
        return /^#?([0-9A-Fa-f]{3}){1,2}$/.test(value);
    }

    populateForm(settings) {
        if (settings && settings.eventRanking) {
            this.inputs.loopDuration.value = settings.eventRanking.pageDuration;
            this.inputs.pageSize.value = settings.eventRanking.pageSize;
        }

        if (settings && settings.headToHead) {
            if (settings.headToHead.leftPlayerColor) {
                this.inputs.leftPlayerColor.value = this.colorToHex(settings.headToHead.leftPlayerColor);
                this.inputs.leftPlayerColorText.value = this.inputs.leftPlayerColor.value;
            }
            if (settings.headToHead.rightPlayerColor) {
                this.inputs.rightPlayerColor.value = this.colorToHex(settings.headToHead.rightPlayerColor);
                this.inputs.rightPlayerColorText.value = this.inputs.rightPlayerColor.value;
            }
        }
    }

    colorToHex(color) {
        // Convert rgb(r, g, b) or #hex to hex format
        if (color.startsWith('#')) {
            return color;
        }
        
        if (color.startsWith('rgb')) {
            const result = color.match(/\d+/g);
            if (result && result.length >= 3) {
                const r = parseInt(result[0]).toString(16).padStart(2, '0');
                const g = parseInt(result[1]).toString(16).padStart(2, '0');
                const b = parseInt(result[2]).toString(16).padStart(2, '0');
                return `#${r}${g}${b}`.toUpperCase();
            }
        }
        
        return color;
    }

    async resetDefaults() {
        if (confirm("Are you sure you want to reset all settings to their default values?")) {
            try {
                const settings = await this.connection.invoke("ResetDisplaySettings");
                this.populateForm(settings);
                this.showToast("Settings reset to defaults!");
            } catch (err) {
                console.error("Error resetting settings:", err);
                alert("Failed to reset settings on server.");
            }
        }
    }

    async saveSettings() {
        const duration = parseInt(this.inputs.loopDuration.value);
        const size = parseInt(this.inputs.pageSize.value);

        if (isNaN(duration) || duration < 1 || isNaN(size) || size < 1) {
            alert("Please enter valid positive numbers.");
            return;
        }

        const settingsPayload = {
            eventRanking: {
                pageDuration: duration,
                pageSize: size
            }
        };

        try {
            await this.connection.invoke("UpdateDisplaySettings", settingsPayload);
            this.showToast("Settings sent to server!");
        } catch (err) {
            console.error("Error saving settings:", err);
            alert("Failed to save settings to server.");
        }
    }

    async saveH2HSettings() {
        const leftColor = this.inputs.leftPlayerColor.value;
        const rightColor = this.inputs.rightPlayerColor.value;

        if (!this.isValidHexColor(leftColor) || !this.isValidHexColor(rightColor)) {
            alert("Please enter valid hex colors.");
            return;
        }

        const settingsPayload = {
            headToHead: {
                leftPlayerColor: leftColor,
                rightPlayerColor: rightColor
            }
        };

        try {
            await this.connection.invoke("UpdateDisplaySettings", settingsPayload);
            this.showToast("H2H settings saved successfully!");
        } catch (err) {
            console.error("Error saving H2H settings:", err);
            alert("Failed to save H2H settings to server.");
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        const span = toast.querySelector('span');
        if (span) span.innerText = message;

        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

const controller = new SettingsController();
document.addEventListener('DOMContentLoaded', () => controller.init());

window.saveSettings = () => controller.saveSettings();
window.saveH2HSettings = () => controller.saveH2HSettings();
window.resetDefaults = () => controller.resetDefaults();