import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.Pusher = Pusher;

const reverbScheme = import.meta.env.VITE_REVERB_SCHEME || 'http';
const reverbHost = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
const reverbPort = Number(import.meta.env.VITE_REVERB_PORT || (reverbScheme === 'https' ? 443 : 8080));

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,

    wsHost: reverbHost,
    wsPort: reverbPort,
    wssPort: reverbPort,

    forceTLS: reverbScheme === 'https',

    enabledTransports: [reverbScheme === 'https' ? 'wss' : 'ws'],
});
