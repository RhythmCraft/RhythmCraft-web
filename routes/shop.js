const express = require('express');
const bodyParser = require('body-parser');
const uniqueString = require('unique-string');

const utils = require('../utils');
const setting = require('../setting.json');

const User = require('../schemas/user');
const Item = require('../schemas/item');
const Inventory = require('../schemas/inventory');

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
    if(req.user.money < item.price) {
        req.flash('Error', '돈이 부족합니다.');
        return res.redirect(`/shop/${req.params.item}`);
    }
    if(!item.multi_buy && check_item != null) {
        req.flash('Error', '해당 아이템을 이미 소유하고 있습니다.');
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

module.exports = app;