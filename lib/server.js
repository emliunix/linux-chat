const net = require("net");
const dgram = require("dgram");
const {Buffer} = require("buffer");
const logutil = require("./logutil.js");
const message = require("./message.js");
const EventEmitter = require("events");
const config = require('../config.js')

/* message format
 * <msgItem>...
 * <msgItem> := <len>:<message>
 * <message> := <action><item>...
 * <action> := conn | disc | send | beat
 * <item> := <len>:<msg>
 * <len> := _number_
 * <msg> := _string_
 */

/**
 * Manages list of clients
 */
class ClientList {
    constructor() {
        this.clients = [];
        
    }

    static create() { return new ClientList(); }

    static mkClient(name, socket) {
        return {
            session: uniqueId(),
            expireDate: new Date().getTime() + 600000 /* 10mins from now */,
            name,
            socket
        }
    }

    add(client) {
        this.clients.push(client)
    }

    forEach(fn) {
        this.clients.forEach(fn);
    }

    remove(session) {
        var idx = this.clients.findIndex((c) => c.session === session);
        if(-1 !== idx) {
            this.clients.splice(idx, 1);
        }
    } 

    find(session) {
        return this.clients.find((c) => c.session === session)
    }

    findName(name) {
        return this.clients.find((c) => c.name === name)
    }

    checkExpire() {
        var t = new Date().getTime();
        var idx = void 0;
        while(-1 !== (idx = this.clients.findIndex((c) => c.expireDate < t))) {
            this.clients.splice(idx, 1);
        }
    }
}

var uniqueId = (function() {
    var id = 0;
    return function uniqueId() {
        return (++id).toString();
    }
})();

function mkContext(clients) {
    return {
        clientList: clients
    }
}

handlers = {
    conn: function(msg, ctx) {
        if(ctx.clientList.findName(msg.name)) {
            var fail = message.builders.fail(`name ${msg.name} has been used`);
            ctx.socket.write(fail);
            return;
        }

        if(msg.name.length > config.maxNameLength) {
            var fail = message.builders.fail(`name ${msg.name} exceeds max name length constraint`);
            ctx.socket.write(fail);
            return;
        }

        var cli = ClientList.mkClient(msg.name, ctx.socket);
        ctx.client = cli;
        ctx.clientList.add(cli);

        logutil.info(`${cli.name} logged in with session ${cli.session}`);

        var succ = message.builders.succ(cli.session);
        ctx.socket.write(succ)
    },
    disc: function(msg, ctx) {
        var cli = ctx.clientList.find(msg.session);
        if(cli) {
            ctx.clientList.remove(msg.session);
            ctx.socket.write(message.builders.succ("logged out"));
            logutil.info(`${cli.name} logged out`);
        } else { // not logged in
            if(ctx.client) { // if session expired
                ctx.socket.write(message.builders.succ("session expired. disconnected automatically"))
            }
            ctx.socket.write(message.builders.succ("not logged in"));
        }
        ctx.socket.end();
        ctx.client = void 0;
    },
    send: function(msg, ctx) {
        var cli = ctx.clientList.find(msg.session);
        if(!cli) { // client not connected
            var fail = message.builders.fail(`User with session ${msg.session} is not connected`);
            ctx.socket.write(fail);
            // in case client is saved in ctx, which means the session has expired, clear it
            ctx.client = void 0;
            return;
        }
        // succ msg
        var succ = message.builders.succ("message sent");
        ctx.socket.write(succ);

        logutil.info(`${ctx.client.name} send ${msg.text}`);

        // broadcat message to all clients
        var msg = message.builders.serv(cli.name, msg.text);
        ctx.clientList.forEach(({socket}) => {
            socket.write(msg)
        });
    },
    beat: function(msg, ctx) { /* no op */ }
    /* succ, fail, serv are client side actions */
}

/**
 * a static uniqueId helper method that generates 
 * unique id for the lifecycle of this application
 */
ClientList.uniqueId = (function() {
    var id = 1;
    return function uniqueId() {
        return (id++).toString(16);
    }
})();

function messageHandler(msg, server) {
    var str = msg.toString("UTF-8");
    var action = str.slice(0, 4);
    var msg = message.parsers[action](str);
} 

var server = net.createServer();
var clients = ClientList.create();

server.on("connection", function(s) {
    logutil.debug(`${s.remoteAddress}:${s.remotePort} connected`);
    s.setEncoding("UTF-8");
    var ctx = mkContext(clients);
    ctx.socket = s;
    var buf = message.MessageBuffer.create()

    s.on("data", function(chunck) {
        buf.add(chunck);
        var msg
        while(msg = buf.get()) {
            if(msg.action === "invalid") {
                logutil.warn("invalid message");
                continue;
            }

            var h = handlers[msg.action];
            if(!h) {
                logutil.warn("no handler for message " + msg);
            } else {
                h(msg, ctx);
            }
        }
    })

    s.on("error", function(err) {
        s.end();
    })

    s.on("end", function() {
        if(ctx.client) {
            ctx.clientList.remove(ctx.client);
        }
        ctx.client = void 0;
        logutil.debug(`${s.remoteAddress}:${s.remotePort} disconnected`);
    })
})

server.on("error", function(err) {
    logutil.error(`Server error ${err}`);
})

server.listen(config.port, () => logutil.info(`Server listening at ${config.port}`));

// session expire check timer

setInterval(function () {
    clients.checkExpire();
}, 60000 /* 1 min */);