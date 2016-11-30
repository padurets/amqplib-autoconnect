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
    .then(() => {
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
            now: (resolve, reject) => {
                this.isConnected()
                    .then(resolve)
                    .catch(reject);
            },
            standby: (resolve, reject) => {
                (function channel(delay) {
                    this.isConnected()
                        .then(resolve)
                        .catch(setTimeout.bind(channel.bind(that, this.config.channel.timeChecksStatus), delay));
                }).call(that, 0);
            }
        }
    }
};
```