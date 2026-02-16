const BackupManager = {
    STATE_KEY: 'overlay_current_state',
    HISTORY_KEY: 'overlay_state_history',
    MAX_HISTORY: 50,

    save(state) {
        if (!state) return;
        const timestamp = new Date().toLocaleString();
        const stateCopy = JSON.parse(JSON.stringify(state));

        // Save Current
        localStorage.setItem(this.STATE_KEY, JSON.stringify({ timestamp, state: stateCopy }));

        // Update History
        let history = this.getHistory();
        history.unshift({ timestamp, state: stateCopy });
        if (history.length > this.MAX_HISTORY) history = history.slice(0, this.MAX_HISTORY);

        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    },

    getHistory() {
        const data = localStorage.getItem(this.HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    },

    downloadAsFile() {
        const history = this.getHistory();
        if (history.length === 0) return alert("No history to save.");

        const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wca_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};