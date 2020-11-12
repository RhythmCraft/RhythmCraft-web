window.onload = () => {
    const allowed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890-'.split('');
    const InputPromotion = document.getElementById('InputPromotion');

    InputPromotion.focus();
    InputPromotion.oninput = function() {
        this.value = this.value.replace(/-/g, '').replace(/(.{5})/g,"$1-").toUpperCase();

        if(this.value.endsWith('-')) this.value = this.value.slice(0, -1);

        let result_text = '';
        this.value.split('').forEach(t => {
            if(allowed.includes(t)) result_text += t;
        });
        this.value = result_text;
    }

    document.getElementById('form').onsubmit = e => {
        if(!/^[A-Z0-9]{5}(-[A-Z0-9]{5}){4}$/.test(InputPromotion.value)) {
            document.getElementById('info').innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">
    프로모션 코드를 형식에 맞게 입력하세요.
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
    </button>
</div>`;
            InputPromotion.focus();
            return e.preventDefault();
        }
    }
}