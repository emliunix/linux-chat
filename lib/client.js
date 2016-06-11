const net = require("net"),
    config = require("../config.js"),
    message = require("./message.js"),
    logutil = require("./logutil.js");

class Client {
    constructor(addr) {
        this.addr = addr;
        this.isConnected = false;
    }
    static create(addr) {
        return new Client(addr);
    }
    connect(name) {
        // init promise
        var resolve, reject, promise = new Promise((res, rej) => {
            resolve = res; reject = rej;
        })

        // connect error handler
        var _error_handler = (err) => {
            reject({msg: "unable to connect " + err});
        }
        var socket = net.connect(config.port, this.addr, () => {
            socket.setEncoding("UTF-8"); 
            // remove the connect error handler to avoid being called in other errors
            socket.removeListener("error", _error_handler);

            // setup socket listeners
            var buf = message.MessageBuffer.create();
            socket.on("data", (chunck) => {
                buf.add(chunck);
                var msg = void 0;
                while(msg = buf.get()) {
                    var h;
                    // dispatch message
                    if("serv" === msg.action) {
                        if(h = this.onmsg_handler) {
                            h(msg);
                        }
                    } else if("succ" === msg.action) {
                        if(h = this._succ_handler) {
                            h(msg);
                            this._succ_handler = void 0;
                            this._fail_handler = void 0;
                        }
                    } else if("fail" === msg.action) {
                        if(h = this._fail_handler) {
                            h(msg);
                            this._succ_handler = void 0;
                            this._fail_handler = void 0;
                        }
                    }
                }
            })

            socket.on("error", (err) => {
                var h = void 0;
                if(h = this.ondisconnected_handler) {
                    h(err)
                }
                socket.end();
            })

            socket.on("end", () => {
                this.isConnected = false;
                this.session = void 0;
                this.socket = void 0;

                var h;
                if(h = this.ondisconnected_handler) {
                    h();
                }
            })

            // send conn message
            this._succ_handler = (msg) => {
                this.isConnected = true;
                this.session = msg.msg;
                this.socket = socket;
                resolve(msg)
            }

            this._fail_handler = (msg) => {
                reject(msg);
                socket.end();
            }
            socket.write(message.builders.conn(name))
        }).on("error", _error_handler);

        return promise;
    }
    disconnect() {
        // init promise
        var resolve, reject, promise = new Promise((res, rej) => {
            resolve = res; reject = rej;
        })

        if(this.isConnected) {
            this._succ_handler = (msg) => {
                resolve(msg)
            }
            this._fail_handler = (msg) => {
                reject(msg);
            }
            this.socket.write(message.builders.disc(this.session))
        } else {
            reject({msg: "not connected"})
        }

        return promise;
    }
    send(msg) {
        // init promise
        var resolve, reject, promise = new Promise((res, rej) => {
            resolve = res; reject = rej;
        })

        if(this.isConnected) {
            this._succ_handler = (msg) => {
                resolve(msg);
            }
            this._fail_handler = (msg) => {
                reject(msg);
            }
            this.socket.write(message.builders.send(this.session, msg))
        } else {
            reject({msg: "not connected"});
        }

        return promise;
    }
    onmsg(fn) {
        this.onmsg_handler = fn;
    }
    ondisconnected(fn) {
        this.ondisconnected_handler = fn;
    }
    get connected() {
        return this.isConnected;
    }
}

module.exports = {
    Client
}