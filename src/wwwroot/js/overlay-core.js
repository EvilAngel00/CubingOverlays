export class OverlayCore {
    constructor() {
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl("/overlayHub")
            .withAutomaticReconnect()
            .build();
    }

    async start() {
        try {
            await this.connection.start();
            console.log("SignalR Connected");
        } catch (err) {
            console.error("Connection Failed: ", err);
        }
    }

    async restoreLastRankings() {
        try {
            const lastRankings = await this.connection.invoke("GetLastRankings");
            if (lastRankings) {
                console.log("Restored last rankings:", lastRankings);
                this.currentRankings = lastRankings;
            } else {
                console.log("No previous rankings to restore");
            }
        } catch (err) {
            console.error("Error restoring last rankings:", err);
        }
    }

    getMainDisplayTime(result, eventId, format) {
        var useBest = false;
        const bestOfFormats = ['1', '2', '3', '4', '5'];
        if (bestOfFormats.includes(format)) {
            useBest = true;
        }

        var timeValue = useBest ? result.best : result.average;

        // Special handling for 333fm (Fewest Moves)
        if (eventId === '333fm') {
            timeValue = useBest ? timeValue : timeValue / 100;
        }

        return this.formatTime(timeValue, eventId);
    }

    formatTime(value, eventId) {
        if (!value || value <= 0) {
            if (value === -1) return 'DNF';
            if (value === -2) return 'DNS';
            return '';
        }

        // Fewest Moves
        if (eventId === '333fm') return value.toFixed(2);

        // Multi-Blind
        if (eventId === "333mbf") {
            const str = value.toString().padStart(10, '0');
            const dd = parseInt(str.substring(1, 3));
            const ttttt = parseInt(str.substring(3, 8));
            const mm = parseInt(str.substring(8, 10));
            const solved = (99 - dd) + mm;
            const attempted = solved + mm;
            const mins = Math.floor(ttttt / 60);
            const secs = ttttt % 60;
            return `${solved}/${attempted} ${mins}:${secs.toString().padStart(2, '0')}`;
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