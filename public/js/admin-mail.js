window.onload = () => {
    document.getElementById('html').oninput = () => {
        const ele = document.getElementById('html_preview');
        const input = document.getElementById('html');

        ele.innerHTML = input.value;
    }
}