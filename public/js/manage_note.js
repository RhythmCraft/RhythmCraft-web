window.onload = () => {
    if(isClient) {
        require('electron').remote.getGlobal('globalVars').RichPresence = {
            details: '채보 목록 보는 중',
            startTimestamp: Date.now(),
            largeImageKey: 'main',
            instance: true
        }
    }

    document.getElementById('InputSearch').focus();
}

document.onkeydown = e => {
    if(e.ctrlKey && e.code == 'KeyP') {
        document.getElementById('lucky_play').value = 'true';
        document.getElementById('submit_search').click();
    }
}