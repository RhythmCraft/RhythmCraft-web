let note;
const note_speed = 1000;

window.onload = () => {
    note = JSON.parse(note_file);
    let note_time = startpos;
    let pressedkey = [];

    if(isClient) {
        require('electron').remote.getGlobal('globalVars').RichPresence = {
            details: '수정 중',
            state: note.musicname,
            startTimestamp: Date.now(),
            largeImageKey: 'main',
            instance: true
        }
    }

    renderNote(note, note_time);

    document.getElementById('autoplay').checked = autoplay;
    document.getElementById('unsafe_mode').checked = unsafe_mode;

    document.getElementById('Play').onclick = function() {
        const result = save();
        const pitch = document.getElementById('InputPitch').value;
        const autoplay = document.getElementById('autoplay').checked;
        const unsafe = document.getElementById('unsafe_mode').checked;
        if(result == 'ok') location.href = `/testnote?note=${note_name}&startpos=${note_time}&fromeditor=true&pitch=${pitch}&autoplay=${autoplay}&unsafe=${unsafe}`;
        else alert('노트 저장에 실패했습니다.');
    }

    document.getElementById('Save').onclick = function() {
        const result = save();
        if(result != 'ok') alert('노트 저장에 실패했습니다.');
    }

    document.getElementById('DecreaseTime').onclick = function() {
        if(note_time - 100 < 0) return;
        note_time -= 100;
        renderNote(note, note_time);
        document.getElementById('InputTime').value = note_time;
    }

    document.getElementById('IncreaseTime').onclick = function() {
        note_time += 100;
        renderNote(note, note_time);
        document.getElementById('InputTime').value = note_time;
    }

    document.getElementById('InputTime').oninput = function(e) {
        note_time = Number(this.value);
        renderNote(note, note_time);
    }

    Array.from(document.getElementsByClassName('note_area')).forEach(ele => {
        ele.onclick = function(e) {
            let notenum = this.id.replace('note_', '');
            notenum = Number(notenum.replace('_area', ''));

            note['note'][`note${notenum}`].push(Math.round(getms(innerHeight - e.clientY - 24.5)) + note_time);
            renderNote(note, note_time);

            setTimeout(() => {
                save();
            }, 0);
        }

        ele.oncontextmenu = function(e) {
            e.preventDefault();
            note['jscode'][Math.round(getms(innerHeight - e.clientY - 24.5)) + note_time + 30] = '';
            renderNote(note, note_time);

            setTimeout(() => {
                save();
            }, 0);
        }
    });

    document.getElementById('SaveScript').onclick = function() {
        const inputscript = document.getElementById('InputScript');
        note['jscode'][inputscript.dataset.effect] = inputscript.value;

        setTimeout(() => {
            save();
        }, 0);
    }

    document.getElementById('HideScriptSetting').onclick = function() {
        Array.from(document.getElementsByClassName('editscript')).forEach(ele => {
            ele.hidden = true;
        });
    }

    document.getElementById('help_button').onclick = function() {
        document.getElementById('help_area').hidden = !document.getElementById('help_area').hidden;
    }

    document.getElementById('Exit').onclick = function() {
        save();
        location.href = '/note';
    }

    document.onkeydown = e => {
        pressedkey[e.keyCode] = true;

        if(pressedkey[80]) {
            document.getElementById('Play').click();
        }
        if(pressedkey[17] && pressedkey[83]) {
            e.preventDefault();
            document.getElementById('Save').click();
        }
        if(pressedkey[189]) {
            document.getElementById('DecreaseTime').click();
        }
        if(pressedkey[187]) {
            document.getElementById('IncreaseTime').click();
        }
        if(pressedkey[220]) {
            document.getElementById('InputTime').value = 0;
            note_time = 0;
            renderNote(note, note_time);
        }
    }
    document.onkeyup = e => {
        pressedkey[e.keyCode] = false;
    }
}

function renderNote(note, look_time) {
    if(typeof note == 'string') note = JSON.parse(note);

    Array.from(document.getElementsByClassName('note')).forEach(ele => {
        ele.remove();
    });
    Array.from(document.getElementsByClassName('script')).forEach(ele => {
        ele.remove();
    });

    for(let i in note.note) {
        note['note'][i].forEach(time => {
            const position = (((innerHeight * 0.65 / note_speed) * (time - look_time)) + innerHeight * 0.65 / note_speed) + innerHeight * 0.3;
            if(position < innerHeight && position > 0) {
                const newnote = document.createElement('div');
                newnote.classList.add(`note`);
                newnote.classList.add(`note_${i.replace('note', '')}`);
                newnote.dataset.note_position = time;

                newnote.style.bottom = `${position}px`;

                const image = document.createElement('img');
                image.src = `/game/img/note_${i.replace('note', '')}.png`;
                image.classList.add('note_image');
                image.onclick = function() {
                    newnote.remove();
                    note['note'][i].splice(note['note'][i].indexOf(time), 1);

                    setTimeout(() => {
                        save();
                    }, 0);
                }
                newnote.appendChild(image);

                document.body.appendChild(newnote);
            }
        });
    }

    for(let i in note.jscode) {
        const position = (((innerHeight * 0.65 / note_speed) * (Number(i) - look_time)) + innerHeight * 0.65 / note_speed) + innerHeight * 0.3;
        if(position < innerHeight && position > 0) {
            const newscript = document.createElement('div');
            newscript.classList.add('script');
            newscript.dataset.note_position = i;
            newscript.style.bottom = `${position}px`;
            newscript.dataset.script = note['jscode'][i];

            newscript.onclick = function() {
                newscript.remove();
                delete note['jscode'][i];
                renderNote(note, look_time);

                setTimeout(() => {
                    save();
                }, 0);
            }

            newscript.oncontextmenu = function(e) {
                e.preventDefault();
                Array.from(document.getElementsByClassName('editscript')).forEach(ele => {
                    ele.hidden = false;
                });
                const inputscript = document.getElementById('InputScript');
                inputscript.dataset.effect = i;
                inputscript.value = note['jscode'][i];
            }

            document.body.appendChild(newscript);
        }
    }
}

function RequestData(method, url, data) {
    var xhr = new XMLHttpRequest();
    xhr.open( method , url , false );
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.send( JSON.stringify(data) );
    return xhr.responseText;
}

function getms(px) {
    let temp = nerdamer.solve(`(((${innerHeight}*0.65/${note_speed})*(x-0))+${innerHeight}*0.65/${note_speed})+${innerHeight}*0.3=${px}`, 'x').toString().replace('[', '').replace(']', '').split('/');
    return temp[0] / temp[1];
}

function save() {
    return RequestData('post', '/savenote', {
        name: note_name,
        note
    });
}