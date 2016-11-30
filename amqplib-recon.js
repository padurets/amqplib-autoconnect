var amqplib = require('amqplib');
var extend = require('extend');

class Amqp {
    constructor(cfg){
        this.config = extend(true, {
            url: 'amqp://guest:guest@localhost:5672',
            reconnect_time: 2000
        }, cfg);

        this.is_connected = 0;
        this._connect();
    }

    getChanel(){
        var that = this;

        return new Promise((resolve, reject) => {
            (function getChanel(delay) {
                if(this.is_connected && this.channel){
                    resolve(this.channel);
                }else{
                    setTimeout(getChanel.bind(that, 1000), delay);
                }
            }).call(that, 0);
        });
    }

    _connect(){
        amqplib.connect(this.config.url)
            .then((connection) => {
                this.connection = connection;
                this.is_connected = 1;


                connection.createChannel()
                    .then((channel) => {
                        channel.on('error', this._reconnect.bind(this));
                        channel.on('close', this._reconnect.bind(this));
                        this.channel = channel;
                    });
            })
            .catch(() => {
                this._reconnect();
            });
    }

    _disconnect(){
        if(this.is_connected) this.connection.close();
        this.channel = null;
        this.is_connected = 0;
    }

    _reconnect(){
        this._disconnect();
        setTimeout(this._connect.bind(this), this.config.reconnect_time);
    }
}

module.exports = Amqp;