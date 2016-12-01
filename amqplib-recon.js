var amqplib = require('amqplib');
var extend = require('extend');
var defaul_config = {
    url: 'amqp://guest:guest@localhost:5672',
    timeReconnect: 2000,
    channel: {
        mode: 'now', // now, standby
        timeCheckStatus: 1000,
        modeHandlers: {
            now: function (resolve, reject) {
                this.isConnected()
                    .then(resolve)
                    .catch(reject);
            },
            standby: function (resolve, reject) {
                (function check(delay) {
                    var next_delay = this.config.channel.timeCheckStatus;
                    var recheck = check.bind(this, next_delay);

                    this.isConnected()
                        .then(resolve)
                        .catch(setTimeout.bind(this, recheck, delay));
                }).call(this, 0);
            }
        }
    },
    queue: {
        durable: true
    },
    publish: {
        persistent: true
    },
    consume: {
        noAck: false
    }
};

function errorObj(code, data, info) {
    return {
        error: {
            code: code,
            info: info
        },
        data: data
    };
}

class Amqp {
    constructor(cfg){
        this.config = extend(true, defaul_config, cfg);
        this.channel_stream = null;
        this.is_connected = 0;
        this._connect();
    }

    channel(cfg){
        var opt = extend({}, this.config.channel, cfg);
        var modeHandler = opt.modeHandlers[opt.mode];

        return new Promise((resolve, reject) => {
            if(typeof modeHandler === 'function'){
                modeHandler.call(this, resolve, reject);
            }else{
                throw 'unknow mode';
            }
        });
    }

    publish(q, data, cfg){
        var opt = extend({}, this.config.publish, cfg);

        return new Promise((resolve, reject) => {
            this._validateQueueName(q)
                .then((queue) => {
                    this.channel()
                        .then((ch) => {
                            ch.assertQueue(queue, this.config.queue)
                                .then(() => {
                                    ch.sendToQueue(queue, Buffer.from(data), opt);
                                    ch.waitForConfirms()
                                        .then(resolve)
                                        .catch((err) => { reject( errorObj(4, data, err) ) });
                                });
                        })
                        .catch((err) => { reject( errorObj(2, data, err) ) });
                })
                .catch(reject);
        });
    }

    isConnected(){
        return new Promise((resolve, reject) => {
            var ch = this.channel_stream;
            (this.is_connected && ch) ? resolve.call(ch, ch) : reject.call(ch, 'not connected');
        });
    }

    _validateQueueName(q){
        var queue = !!q ? q : !!this.config.queue ? this.config.queue : null;
        return new Promise((resolve, reject) => {
            if(typeof queue === 'string'){
                resolve(queue);
            }else{
                reject( errorObj(1, data, 'incorrect queue name') );
            }
        });
    }

    _connect(){
        amqplib.connect(this.config.url)
            .then((connection) => {
                this.connection = connection;
                this.is_connected = 1;

                connection.createConfirmChannel()
                    .then((channel) => {
                        channel.on('error', this._reconnect.bind(this));
                        channel.on('close', this._reconnect.bind(this));
                        this.channel_stream = channel;
                    })
                    .catch(this._reconnect.bind(this));;
            })
            .catch(this._reconnect.bind(this));
    }

    _disconnect(){
        if(this.is_connected) this.connection.close();
        this.channel_stream = null;
        this.is_connected = 0;
    }

    _reconnect(){
        this._disconnect();
        setTimeout(this._connect.bind(this), this.config.reconnect_time);
    }

    consume(q, cfg){
        var opt = extend({}, this.config.consume, cfg);

        return new Promise((resolve, reject) => {
            this._validateQueueName(q)
                .then((queue) => {
                    this.channel()
                        .then((chn) => {
                            chn.get(queue, opt)
                            .then((msg) => {
                                var content = msg;
                                if(msg){
                                    content = msg.content.toString();
                                    // if(!opt.noAck){
                                        // chn.ack(msg);
                                    // }
                                }

                                resolve(content)
                            });
                        })
                        .catch((err) => {
                            reject()
                        });
                })
                .catch(reject);
        });
    }
}




var amqp = new Amqp({
    channel: {
        mode: 'standby'
    }
});

var x = 0;
// amqp.consume('consumer')
//     .then(consumer)

function consumer (msg) {
    console.log('___'+(x++), msg)
}

setInterval(() => { amqp.consume('consumer', {noAck: true}).then(consumer) }, 500)
setInterval(() => { amqp.publish('consumer', 'котлетка '+ new Date().getTime()) }, 300)

// storekeeper

module.exports = Amqp;