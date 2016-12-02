# amqplib-recon

```
npm i --save amqplib-recon
```

### Simple usage example

``` js
var Amqp = require('amqplib-recon');
var amqp = new Amqp();
var data = {message: 'hello'};

// Publisher
amqp.publish('queue', JSON.stringify(data));

// Consumer
amqp.consume('queue')
    .then(function(msg){
        // operations msg...
    });
```

### Default config
``` js
var defaul_config = {
    url: 'amqp://guest:guest@localhost:5672',
    timeReconnect: 2000,
    channel: {
        mode: 'now', // is key modeHandlers
        timeCheckStatus: 1000,
        modeHandlers: {
            now: function(resolve, reject) {
                this.isConnected()
                    .then(resolve)
                    .catch(reject);
            },
            standby: function(resolve, reject) {
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
```

### #.channel( [options] )
Get the channel. Return Promise. By default ```options``` is taken from the ```defaul_config.channel``` and it has the same model
##### Examples:
``` js
var options = {
    mode: 'standby'
};

var onGetChannel = function(chn) {
    // chn is a amqplib channel object
    var queue = 'queue_name';
    chn.assertQueue(queue, {durable: true})
        .then(() => {
            var formatted_data = Buffer.from( JSON.stringify(data) );
            chn.sendToQueue(queue, formatted_data, {persistent: true});
        });
};

// "standby" mode
amqp.channel(options)
    .then(onGetChannel);

// "now" mode (by default)
amqp.channel()
    .then(onGetChannel)
    .catch(function() {
        // if the channel is not available do another
    });
```

### #.publish( queue, content, [options] )
Return Promise. By default ```options``` is taken from the ```defaul_config.publish``` and it has the same model
##### Examples:
``` js
amqp.publish('queue', JSON.stringify(data))
    .then(function(){
        // success function
    })
    .catch(function(err){
        // fail function
    });
```

### #.consume( queue, [options] )
Return Promise. By default ```options``` is taken from the ```defaul_config.consume``` and it has the same model
##### Examples:
``` js
var options = {
    ackByHand: true
};

amqp.consume('consumer', options)
    .then(function(res){
        var ack = res.ack;
        console.log(res.msg);

        if(ack){
            ack();
        }
    })
```