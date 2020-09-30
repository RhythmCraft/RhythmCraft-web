function updatePreview() {
    var ele = document.getElementById('html_preview');
    var input = document.getElementById('html');

    ele.innerHTML = input.value;
}

setInterval(updatePreview, 1);