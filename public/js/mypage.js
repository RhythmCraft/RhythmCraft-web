window.onload = function() {
    document.getElementById('InputNickname').focus();

    Array.from(document.getElementsByClassName('setkey')).forEach(ele => {
        ele.onkeydown = e => {
            e.preventDefault();
            ele.value = e.code;
        }
    });
}