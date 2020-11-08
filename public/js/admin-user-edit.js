window.onload = function() {
    Array.from(document.getElementsByClassName('setkey')).forEach(ele => {
        ele.onkeydown = e => {
            e.preventDefault();
            ele.value = e.code;
        }
    });

    document.getElementById('InputGameSkin').value = game_skin_value;

    document.getElementById('InputGameSkin').onchange = InputCustomGameSkinStatus;
    InputCustomGameSkinStatus();
}

function InputCustomGameSkinStatus() {
    if(document.getElementById('InputGameSkin').value == 'custom_skin') document.getElementById('input_custom_skin').hidden = false;
    else document.getElementById('input_custom_skin').hidden = true;
}