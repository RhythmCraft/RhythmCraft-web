window.onload = () => {
    if(document.getElementById('InputSearch') != null) document.getElementById('InputSearch').focus();

    Array.from(document.getElementsByClassName('item')).forEach(e => {
        e.onclick = () => {
            location.href = `/shop/${e.dataset.productid}`;
        }
    });
}