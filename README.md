# amqplib-recon

```
npm i --save amqplib-recon
```

### Simple usage example

``` js
var Amqp = require('amqplib-recon');
var amqp = new Amqp();
var data = {message: 'hello'};

// Simple publisher
amqp.publish('queue', JSON.stringify(data));

```

### Default config
``` js
var defaul_config = {
    url: 'amqp://guest:guest@localhost:5672',
    timeReconnect: 2000,
    channel: {
        mode: 'now', // is key modeHandlers
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
```

### #.channel( [channel_options] )
Get the channel. Return Promise. By default ```channel_options``` is taken from the ```defaul_config.channel``` and it has the same model
##### Examples:
``` js
var channel_options = {
    mode: 'standby'
};

var onGetChannel = function(chn) {
    // chn (or this) is a amqplib channel object
    var queue = 'queue_name';
    this.assertQueue(queue, {durable: true})
        .then(() => {
            var formatted_data = Buffer.from( JSON.stringify(data) );
            chn.sendToQueue(queue, formatted_data, {persistent: true});
        });
};

// "standby" mode
amqp.channel(channel_options)
    .then(onGetChannel);

// "now" mode (by default)
amqp.channel()
    .then(onGetChannel)
    .catch(function() {
        // if the channel is not available do another
    });
```

### #.publish( queue, content, [channel_options] )
return Promise
##### Examples:
``` js
var channel_options = {
    mode: 'custom',
    modeHandlers: {
        custom: function (success, fail) {
            this.isConnected()
                .then(resolve)
                .catch(reject);
            /*
                other operations
            */
        },
    }
};

amqp.publish('queue', JSON.stringify(data), channel_options)
    .then(function(err){
        // success function
    })
    .catch(function(err){
        // fail function
    });
```