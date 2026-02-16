class SettingsController {
    constructor() {
        this.connection = null;
        this.inputs = {
            loopDuration: document.getElementById('loopDuration'),
            pageSize: document.getElementById('pageSize')
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
    }

    populateForm(settings) {
        if (settings && settings.eventRanking) {
            this.inputs.loopDuration.value = settings.eventRanking.pageDuration;
            this.inputs.pageSize.value = settings.eventRanking.pageSize;
        }
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
            // Add other categories here later
        };

        try {
            await this.connection.invoke("UpdateDisplaySettings", settingsPayload);
            this.showToast("Settings sent to server!");
        } catch (err) {
            console.error("Error saving settings:", err);
            alert("Failed to save settings to server.");
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
window.resetDefaults = () => controller.resetDefaults();