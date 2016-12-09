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
        noAck: false,
        ackByHand: false
    }
};
var errors = {
    1: 'unknow mode',
    2: 'published messages not have been confirmed',
    3: 'not connected',
    4: 'incorrect queue name',
    5: 'error when receiving a message'
};

function errInfo(code, data) {
    var message = errors[code] ? errors[code] : 'unknow error';

    return {
        error: {
            code: code,
            message: message
        },
        data: data
    };
}

class Amqp {
    constructor(cfg){
        this.config = extend(true, {}, defaul_config, cfg);
        this.channel_stream = null;
        this.is_connected = 0;
        this._connect();
    }

    channel(cfg){
        return new Promise((resolve, reject) => {
            var opt = extend(true, {}, this.config.channel, cfg);
            var modeHandler = opt.modeHandlers[opt.mode];

            if(typeof modeHandler === 'function'){
                modeHandler.call(this, resolve, reject);
            }else{
                reject( errInfo(1) );
            }
        });
    }

    publish(q, data, cfg){
        return new Promise((resolve, reject) => {
            var opt = extend(true, {}, this.config.publish, cfg);

            this._validateQueueName(q)
                .then((queue) => {
                    this.channel()
                        .then((ch) => {
                            ch.assertQueue(queue, this.config.queue)
                                .then(() => {
                                    ch.sendToQueue(queue, Buffer.from(data), opt);
                                    ch.waitForConfirms()
                                        .then(resolve)
                                        .catch((err) => { reject( errInfo(2, err) ) });
                                });
                        })
                        .catch(reject);
                })
                .catch(reject);
        });
    }

    consume(q, cfg){
        return new Promise((resolve, reject) => {
            var opt = extend(true, {}, this.config.consume, cfg);

            this._validateQueueName(q)
                .then((queue) => {
                    this.channel()
                        .then((chn) => {
                            chn.get(queue, opt)
                                .then((msg) => {
                                    var ack = null;
                                    var msg_string = false;

                                    if(msg){
                                        msg_string = msg.content.toString();
                                        if(!opt.noAck){
                                            ack = chn.ack.bind(chn, msg);
                                            if(!opt.ackByHand){
                                                ack();
                                                ack = null;
                                            }
                                        }
                                    }

                                    resolve({
                                        msg: msg_string,
                                        ack: ack
                                    });
                                })
                                .catch(reject.bind(errInfo(5)));
                        })
                        .catch(reject);
                })
                .catch(reject);
        });
    }

    isConnected(){
        return new Promise((resolve, reject) => {
            var ch = this.channel_stream;
            (this.is_connected && ch) ? resolve.call(ch, ch) : reject.call(ch, errInfo(3));
        });
    }

    _validateQueueName(q){
        return new Promise((resolve, reject) => {
            var queue = !!q ? q : !!this.config.queue ? this.config.queue : null;

            if(typeof queue === 'string'){
                resolve(queue);
            }else{
                reject( errInfo(4, queue) );
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
}

module.exports = Amqp;