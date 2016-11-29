# amqplib-autoconnect

### Config
``` js

var config = {
    server: 'amqp://localhost',
    user: '',
    password: '',
    reconnect_time: 2000,
}

```

### Usage example

``` js
import Amqp from 'amqplib-autoconnect';

class Storage {
    constructor(cfg){
        this.amqp = new Amqp(cfg.amqp);
    }

    save(queue, data){
        this.amqp.send(queue, data)
            .catch(() => {
                //...
            });
    }
}

```