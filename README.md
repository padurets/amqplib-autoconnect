# amqplib-recon

```
npm i --save amqplib-recon
```

### Default config
``` js

var config = {
    url: 'amqp://guest:guest@localhost:5672',
    reconnect_time: 2000
}

```

### Usage example

``` js
var Amqp = require('amqplib-recon');
var amqp = new Amqp(config);

amqp.getChanel()
    .then((chn) => {
        // chn is a amqplib channel object
        var queue = 'queue_name';

        chn.assertQueue(queue, {durable: true})
            .then(() => {
                var formatted_data = Buffer.from( JSON.stringify('data') );
                chn.sendToQueue(queue, formatted_data, {persistent: true});
            });
    });

```