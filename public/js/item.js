window.onload = () => {
    document.getElementById('buy').onclick = function() {
        if(confirm(`아이템을 구매하시겠습니까? 구매 후 환불은 불가하나, 아이템 삭제시 전액 환불됩니다.\n아이템 가격 : ${this.dataset.price}원\n내가 가진 돈 : ${this.dataset.myMoney}원`))
            location.href = `/buyitem/${this.dataset.item}`;
    }
    document.getElementById('RemoveItem').onclick = e => {
        if(!confirm('정말 아이템을 삭제하시겠습니까? 아이템 삭제시 모두의 인벤토리에서 삭제되고, 전액 환불됩니다!')) e.preventDefault();
    }
}