import amqp from 'amqplib';

export default class Amqp {
    constructor(cfg){
        this.config = cfg;
        this.is_connected = 0;
        this._connect();
    }

    send(queue, data){
        return new Promise((resolve, reject) => {
            if(this.is_connected){
                this.channel.assertQueue(queue, {durable: true})
                    .then(() => {
                        var formatted_data = Buffer.from( JSON.stringify(data) );
                        this.channel.sendToQueue(queue, formatted_data, {persistent: true});
                        resolve();
                    })
                    .catch((err) => {
                        reject(data);
                    });
            }else{
                reject(data);
            }
        });
    }

    _connect(){
        amqp.connect(this.config.server)
            .then((connection) => {
                this.connection = connection;
                this.is_connected = 1;

                connection.createChannel()
                    .then((channel) => {
                        this.channel = channel;
                        channel.on('error', this._reconnect);
                        channel.on('close', this._reconnect);
                    });
            })
            .catch(() => {
                setTimeout(this._reconnect.bind(this), this.config.reconnect_time);
            });
    }

    _disconnect(){
        if(this.is_connected) this.connection.close();
        this.channel = null;
        this.is_connected = 0;
    }

    _reconnect(){
        this._disconnect();
        this._connect();
    }
}