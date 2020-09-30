const mongoose = require('mongoose');
const fs = require('fs');

const setting = require('../setting.json');

module.exports = () => {
    const connect = () => {
        mongoose.connect(`mongodb://${setting.MONGODB_USER}:${setting.MONGODB_PASSWORD}@${setting.MONGODB_HOST}:${setting.MONGODB_PORT}/admin`, {
            dbName: setting.DBNAME
        }, (error) => {
            if(error) {
                console.log(`몽고디비 연결 중 오류가 발생하였습니다!\n오류 로그\n${error}`);
            }
            else {
                console.log(`몽고디비 연결에 성공하였습니다.`);
            }
        });
    }
    connect();
    mongoose.connection.on('error', (error) => {
        console.log(`몽고디비 연결 중 오류가 발생하였습니다!\n오류 로그\n${error}`);
    });
    mongoose.connection.on('disconnected', () => {
        console.error('몽고디비 연결이 끊어졌습니다. 연결을 재시도합니다.');
        connect();
    });

    console.log('스키마를 불러오는 중...');
    fs.readdirSync('./schemas').forEach(file => {
        if(file != "index.js") {
            require(`./${file}`);
            console.log(`${file.trim()} 스키마를 연결하였습니다.`);
        }
    });
    console.log('스키마를 모두 불러왔습니다.');
}