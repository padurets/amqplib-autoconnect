var amqplib = require('amqplib');
var extend = require('extend');
var defaul_config = {
    url: 'amqp://guest:guest@localhost:5672',
    timeReconnect: 2000,
    channel: {
        mode: 'now', // now, standby
        timeChecksStatus: 1000,
        modeHandlers: {
            now: (resolve, reject) => {
                this.isConnected()
                    .then(resolve)
                    .catch(reject);
            },
            standby: (resolve, reject) => {
                (function recheck(delay) {
                    this.isConnected()
                        .then(resolve)
                        .catch(setTimeout.bind(recheck.bind(that, this.config.channel.timeChecksStatus), delay));
                }).call(that, 0);
            }
        }
    }
};

class Amqp {
    constructor(cfg){
        this.config = extend(true, defaul_config, cfg);
        this.channel_stream = null;
        this.is_connected = 0;
        this._connect();
    }

    channel(opt){
        return new Promise((resolve, reject) => {
            var cfg = this.config.channel;
            var modeHandler = cfg.modeHandlers[cfg.mode];

            if(modeHandler){
                modeHandler.call(this, resolve, reject);
            }else{
                throw 'unknow mode';
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