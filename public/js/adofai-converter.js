window.onload = () => {
    $('[data-toggle="popover"]').popover();

    let music_selected = false;
    let adofai_selected = false;
    Array.from(document.getElementsByClassName('inputfile')).forEach(ele => {
        ele.onchange = () => {
            if(ele.dataset.type == 'music') music_selected = true;
            if(ele.dataset.type == 'adofai') adofai_selected = true;
        }
    });

    document.getElementById('submit').onclick = () => {
        if(!music_selected || !adofai_selected) {
            if(!music_selected) return alert('음악을 선택해 주세요.');
            if(!adofai_selected) return alert('ADOFAI 파일을 선택해 주세요.');
        }
        else document.getElementById('sendform').click();
    }
}