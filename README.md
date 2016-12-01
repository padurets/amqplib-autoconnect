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

### #.channel( [options] )
Get the channel. Return Promise. By default ```options``` is taken from the ```defaul_config.channel``` and it has the same model
##### Examples:
``` js
var options = {
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