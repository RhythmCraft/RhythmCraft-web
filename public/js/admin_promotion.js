window.onload = () => {
    document.getElementById('InputType').onchange = function() {
        Array.from(document.getElementsByClassName('type_inputs')).forEach(e => e.hidden = true);
        document.getElementById(`type_input_${this.value}`).hidden = false;
    }
    document.getElementById('InputMultiCode').onclick = function() {
        const InputCount = document.getElementById('InputCount');
        InputCount.hidden = !InputCount.hidden;
    }
}