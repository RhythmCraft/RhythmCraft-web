window.onload = () => {
    document.getElementById('InputSearch').focus();
    if(isClient) {
        require('electron').remote.getGlobal('globalVars').RichPresence = {
            details: '음악 목록 보는 중',
            startTimestamp: Date.now(),
            largeImageKey: 'main',
            instance: true
        }
    }

    document.getElementById('music_player_close').onclick = () => {
        document.getElementById('audio_tag').pause();
        document.getElementById('audio_source').src = '';
        document.getElementById('audio_tag').load();
        document.getElementById('music_player').hidden = true;
    }
}

function playMusic(m) {
    document.getElementById('audio_source').src = `/listenmusic?name=${m}`;
    document.getElementById('music_player').hidden = false;
    document.getElementById('audio_tag').load();
    document.getElementById('audio_tag').play();
}