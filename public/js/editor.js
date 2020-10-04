window.onload = () => {
    const note = JSON.parse(note_file);
    let note_time = startpos;

    renderNote(note, note_time);

    document.getElementById('Play').onclick = function() {
        const result = RequestData('post', '/savenote', {
            name: note_name,
            note
        });
        if(result == 'ok') location.href = `/testnote?note=${note_name}&startpos=${note_time}&fromeditor=true`;
        else alert('노트 저장에 실패했습니다.');
    }

    document.getElementById('Save').onclick = function() {
        const result = RequestData('post', '/savenote', {
            name: note_name,
            note
        });
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

            note['note'][`note${notenum}`].push(Math.round(getms(innerHeight - e.clientY - 24.5)));
            renderNote(note, note_time);

            const result = RequestData('post', '/savenote', {
                name: note_name,
                note
            });
        }
    });
}

function renderNote(note, look_time) {
    const note_speed = 1000;
    if(typeof note == 'string') note = JSON.parse(note);

    Array.from(document.getElementsByClassName('note')).forEach(ele => {
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

                    const result = RequestData('post', '/savenote', {
                        name: note_name,
                        note
                    });
                }
                newnote.appendChild(image);

                document.body.appendChild(newnote);
            }
        });
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
    let temp = nerdamer.solve(`(((${innerHeight}*0.65/1000)*(x-0))+${innerHeight}*0.65/1000)+${innerHeight}*0.3=${px}`, 'x').toString().replace('[', '').replace(']', '').split('/');
    return temp[0] / temp[1];
}