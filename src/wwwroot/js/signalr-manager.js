const _signalRReady = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@microsoft/signalr/dist/browser/signalr.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
});

class SignalRManager {
    constructor(url = '/overlayHub') {
        this._url = url;
        this._connection = null;
        this._pendingListeners = [];
    }

    on(event, callback) {
        this._pendingListeners.push({ event, callback });
        return this;
    }

    async start() {
        await _signalRReady;
        this._connection = new signalR.HubConnectionBuilder()
            .withUrl(this._url)
            .withAutomaticReconnect()
            .build();

        this._pendingListeners.forEach(({ event, callback }) => {
            this._connection.on(event, callback);
        });
        this._pendingListeners = [];

        await this._connection.start();
        console.log("SignalR Connected");
        return this;
    }

    async invoke(method, ...args) {
        return await this._connection.invoke(method, ...args);
    }

    get state() {
        return this._connection.state;
    }
}
