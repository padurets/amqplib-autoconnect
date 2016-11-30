# amqplib-recon

```
npm i --save amqplib-recon
```

### Simple usage example

``` js
var Amqp = require('amqplib-recon');
var amqp = new Amqp();
var data = {message: 'hello'};

amqp.channel()
    .then((chn) => {
        // chn (or this) is a amqplib channel object
        var queue = 'queue_name';
        this.assertQueue(queue, {durable: true})
            .then(() => {
                var formatted_data = Buffer.from( JSON.stringify(data) );
                chn.sendToQueue(queue, formatted_data, {persistent: true});
            });
    })
    .catch(() => {
        // if the channel is not available to store data to another location
    });
```
## Configure

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
    }
};
```