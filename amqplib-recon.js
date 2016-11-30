var amqplib = require('amqplib');
var extend = require('extend');
var defaul_config = {
    url: 'amqp://guest:guest@localhost:5672',
    timeReconnect: 2000,
    channel: {
        mode: 'now', // now, standby
        timeChecksStatus: 1000,
        modeHandlers: {
            now: function (resolve, reject) {
                this.isConnected()
                    .then(resolve)
                    .catch(reject);
            },
            standby: function (resolve, reject) {
                (function check(delay) {
                    var next_delay = this.config.channel.timeChecksStatus;
                    var recheck = check.bind(this, next_delay);

                    this.isConnected()
                        .then(resolve)
                        .catch(setTimeout.bind(this, recheck, delay));
                }).call(this, 0);
            }
        }
    },
    queueOptions: {
        durable: true
    },
    publishOptions: {
        persistent: true
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
        var defaul_cfg = this.config.channel;
        var config = (typeof cfg === 'object') ? extend({}, defaul_cfg, cfg) : defaul_cfg;
        var modeHandler = config.modeHandlers[config.mode];

        return new Promise((resolve, reject) => {
            if(typeof modeHandler === 'function'){
                modeHandler.call(this, resolve, reject);
            }else{
                throw 'unknow mode';
            }
        });
    }

    publish(q, data, ch_cfg){
        var queue = !!q ? q : !!this.config.queue ? this.config.queue : null;

        return new Promise((resolve, reject) => {
            if(typeof queue === 'string'){
                this.channel(ch_cfg)
                    .then((ch) => {
                        ch.assertQueue(queue, this.config.queueOptions)
                            .then(() => {
                                ch.sendToQueue(queue, Buffer.from(data), this.config.publishOptions);
                                ch.waitForConfirms()
                                    .then(resolve)
                                    .catch((err) => { reject( errorObj(4, data, err) ) });
                            });
                    })
                    .catch((err) => { reject( errorObj(2, data, err) ) });
            }else{
                reject( errorObj(1, data, 'incorrect queue name') );
            }
        });
    }

    isConnected(){
        return new Promise((resolve, reject) => {
            var ch = this.channel_stream;
            (this.is_connected && ch) ? resolve.call(ch, ch) : reject.call(ch, 'not connected');
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