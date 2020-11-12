const express = require('express');
const bodyParser = require('body-parser');
const uniqueString = require('unique-string');

const utils = require('../utils');
const setting = require('../setting.json');

const User = require('../schemas/user');
const Item = require('../schemas/item');
const Inventory = require('../schemas/inventory');
const Promotion = require('../schemas/promotion');

// app 정의
const app = express.Router();

// bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));

app.get('/shop', utils.isLogin, async (req, res, next) => {
    const regex = new RegExp(req.query.search || '', 'i');
    const items = await Item.find().or([
        { title : { $regex : regex } },
        { description : { $regex : regex } }
    ]);
    if(items.length == 0 && req.query.search != null) {
        req.flash('Error', '검색 결과가 없습니다.');
        return res.redirect('/shop');
    }
    return res.render('shop', {
        items
    });
});

app.get('/shop_history', utils.isLogin, async (req, res, next) => {
    const inventory = await Inventory.find({ owner : req.user.fullID });
    for(let i in inventory) {
        const item = await Item.findOne({ product_id : inventory[i].product_id });

        inventory[i]['title'] = item.title;
        inventory[i]['price'] = item.price;
    }
    return res.render('shop_history', {
        inventory
    });
});

app.get('/inventory', utils.isLogin, async (req, res, next) => {
    const inventory = await Inventory.find({ owner : req.user.fullID });
    for(let i in inventory) {
        const item = await Item.findOne({ product_id : inventory[i].product_id });

        inventory[i]['title'] = item.title;
        inventory[i]['description'] = item.description;
        inventory[i]['type'] = item.type;

        inventory[i]['dontshow'] = (req.query.search != null && !item.title.includes(req.query.search) && !item.description.includes(req.query.search));
    }
    return res.render('inventory', {
        inventory
    });
});

app.get('/useitem/:item', utils.isLogin, async (req, res, next) => {
    const item = await Item.findOne({ product_id : req.params.item });
    if(!item) {
        req.flash('Error', '해당 아이템이 존재하지 않습니다.');
        return res.redirect('/inventory');
    }
    const checkitem = await Inventory.findOne({ owner : req.user.fullID , product_id : req.params.item });
    if(!checkitem) {
        req.flash('Error', '해당 아이템을 소유하고 있지 않습니다.');
        return res.redirect('/inventory');
    }
    if(!item.type) {
        req.flash('Error', '착용 가능한 아이템이 아닙니다.');
        return res.redirect('/inventory');
    }

    const equip = req.user.equip;
    equip[item.type] = item.product_id;
    await User.updateOne({ fullID : req.user.fullID }, { equip });

    req.flash('Info', '아이템을 착용하였습니다.');
    return res.redirect('/inventory');
});

app.get('/unuseitem/:type', utils.isLogin, async (req, res, next) => {
    const equip = req.user.equip;
    equip[req.params.type] = null;
    await User.updateOne({ fullID : req.user.fullID }, { equip });

    req.flash('Info', '아이템을 착용 해제하였습니다.');
    return res.redirect('/inventory');
});

app.get('/shop/:item', utils.isLogin, async (req, res, next) => {
    const item = await Item.findOne({ product_id : req.params.item });
    if(!item) {
        req.flash('Error', '해당 아이템이 존재하지 않습니다.');
        return res.redirect('/shop');
    }
    if(item.stop_sell && !req.user.admin) {
        req.flash('Error', '판매 중지된 상품입니다.');
        return res.redirect('/shop');
    }
    return res.render('item', {
        item
    });
});

app.get('/newitem', utils.isAdmin, (req, res, next) => {
    return res.render('newitem');
});

app.post('/newitem', utils.isAdmin, async (req, res, next) => {
    if(req.body.price < 1) {
        req.flash('Error', '돈의 액수는 0보다 커야 합니다!');
        return res.redirect('/newitem');
    }

    const productid = uniqueString();
    await Item.create({
        uploader: req.user.fullID,
        product_id: productid,
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        multi_buy: req.body.multi_buy == 'true',
        type: req.body.type,
        image_name: req.body.image_name
    });
    return res.redirect(`/shop/${productid}`);
});

app.get('/edititem/:item', utils.isAdmin, async (req, res, next) => {
    const item = await Item.findOne({ product_id : req.params.item });
    if(!item) {
        req.flash('Error', '해당 아이템이 존재하지 않습니다.');
        return res.redirect('/shop');
    }
    return res.render('edititem', {
        item
    });
});

app.post('/edititem/:item', utils.isAdmin, async (req, res, next) => {
    const item = await Item.findOne({ product_id : req.params.item });
    if(!item) {
        req.flash('Error', '해당 아이템이 존재하지 않습니다.');
        return res.redirect('/shop');
    }
    if(req.body.price < 1) {
        req.flash('Error', '돈의 액수는 0보다 커야 합니다!');
        return res.redirect(`/edititem/${req.params.item}`);
    }

    await Item.updateOne({ product_id : req.params.item }, {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        multi_buy: req.body.multi_buy == 'true',
        type: req.body.type,
        image_name: req.body.image_name
    });
    req.flash('Info', '아이템 정보가 업데이트되었습니다.');
    return res.redirect(`/shop/${req.params.item}`);
});

app.get('/removeitem/:item', utils.isAdmin, async (req, res, next) => {
    const item = await Item.findOne({ product_id : req.params.item });
    if(!item) {
        req.flash('Error', '해당 아이템이 존재하지 않습니다.');
        return res.redirect('/shop');
    }
    await Item.deleteOne({ product_id : req.params.item });

    const buy_users = await Inventory.find({ product_id : req.params.item });
    for (const u of buy_users) {
        await User.updateOne({ fullID : u.owner }, { $inc : { money : item.price } });
    }

    await Inventory.deleteMany({ product_id : req.params.item });
    req.flash('Info', '아이템이 삭제되었습니다.');
    return res.redirect('/shop');
});

app.get('/stopitem/:item', utils.isAdmin, async (req, res, next) => {
    const item = await Item.findOne({ product_id : req.params.item });
    if(!item) {
        req.flash('Error', '해당 아이템이 존재하지 않습니다.');
        return res.redirect('/shop');
    }
    await Item.updateOne({ product_id : req.params.item }, { stop_sell : !item.stop_sell });
    req.flash('Info', `아이템 판매 ${item.stop_sell ? '재개' : '중지'} 처리가 완료되었습니다.`);
    return res.redirect(`/shop/${req.params.item}`);
});

app.get('/buyitem/:item', utils.isLogin, async (req, res, next) => {
    const item = await Item.findOne({ product_id : req.params.item });
    const check_item = await Inventory.findOne({ owner : req.user.fullID , product_id : req.params.item });
    if(!item) {
        req.flash('Error', '해당 아이템이 존재하지 않습니다.');
        return res.redirect('/shop');
    }
    if(item.stop_sell) {
        req.flash('Error', '판매 중지된 상품입니다.');
        return res.redirect('/shop');
    }
    if(!item.multi_buy && check_item != null) {
        req.flash('Error', '해당 아이템을 이미 소유하고 있습니다.');
        return res.redirect(`/shop/${req.params.item}`);
    }
    if(req.user.money < item.price) {
        req.flash('Error', '돈이 부족합니다.');
        return res.redirect(`/shop/${req.params.item}`);
    }

    await User.updateOne({ fullID : req.user.fullID }, { $inc : { money : item.price * -1 } });
    await Inventory.create({
        owner: req.user.fullID,
        product_id: req.params.item
    });
    req.flash('Info', '아이템 구매 처리가 완료되었습니다.');
    return res.redirect(`/shop/${req.params.item}`);
});

app.get('/promotion', utils.isLogin, (req, res, next) => {
    return res.render('promotion');
});

app.post('/promotion', utils.isLogin, async (req, res, next) => {
    if(!/^[A-Z0-9]{5}(-[A-Z0-9]{5}){4}$/.test(req.body.code)) {
        req.flash('Error', '유효하지 않은 프로모션 코드 형식입니다.');
        return res.redirect('/promotion');
    }

    const promotion = await Promotion.findOne({ code : req.body.code });
    if(!promotion) {
        req.flash('Error', '존재하지 않는 프로모션 키입니다.');
        return res.redirect('/promotion');
    }
    if(promotion.expires <= Date.now()) {
        req.flash('Error', '유효기간이 지나 사용 처리할 수 없습니다. 1분 안에 이 키가 서버에서 삭제됩니다.');
        return res.redirect('/promotion');
    }

    switch(promotion.type) {
        case 'money':
            await User.updateOne({ fullID : req.user.fullID }, { $inc : { money : promotion.promotion_money } });
            req.flash('Info', `프로모션 코드를 성공적으로 사용하였습니다!<br>돈 ${promotion.promotion_money}원이 계정에 추가되었습니다.`);
            break;
        case 'item':
            const item = await Item.findOne({ product_id : promotion.promotion_item });
            const check_item = await Inventory.findOne({ owner : req.user.fullID , product_id : req.params.item });
            if(!item) {
                req.flash('Error', '해당 프로모션 코드로 얻을 아이템을 찾을 수 없습니다. 관리자에게 문의하세요.');
                return res.redirect('/promotion');
            }
            if(!item.multi_buy && check_item != null) {
                req.flash('Error', '해당 아이템을 이미 소유하고 있어 프로모션 코드를 사용할 수 없습니다.<br>친구에게 키를 선물하는 것은 어떨까요? :)');
                return res.redirect('/promotion');
            }

            await Inventory.create({
                owner: req.user.fullID,
                product_id: promotion.promotion_item
            });
            req.flash('Info', `프로모션 코드를 성공적으로 사용하였습니다!<br>아이템 ${item.title}이(가) 계정에 추가되었습니다.`);
            break;
    }

    await Promotion.deleteOne({ code : req.body.code });
    return res.redirect('/promotion');
});

module.exports = app;