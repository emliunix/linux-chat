"use strict"

var username = void 0;
var connected = false;
var msg_handler = void 0;
var disconnected_handler = void 0;

// setInterval(function() {
//     connected = false;
//     disconnected_handler ? disconnected_handler({level: "error", msg: "disconnected unexpectedly"}) : void 0;
// }, 10000);

module.exports = {
    connect: function(_username) {
        return new Promise(function(resolve, reject) {
            if(_username && _username.trim()) {
                username = _username.trim(); connected = true;
                resolve({msg: "ok"});
            } else {
                reject({level: "warn", msg: "empty nickname"});
            }
        });
    },
    disconnect: function() {
        return new Promise(function (resolve, reject) {
            connected = false;
            var msg = {msg: "user disconnected", level: "warn"};
            disconnected_handler && disconnected_handler(msg)
            resolve({msg: "ok"});
        });
    },
    send: function(msg) {
        return new Promise(function(res, rej) {
            if(connected === false) {
                rej({
                    level: "warn",
                    msg: "not connected"
                })
                return;
            }

            if(!(msg && msg.trim())) {
                rej({
                    level: "warn",
                    msg: "empty message"
                })
                return;
            }

            console.log(`send(${msg})`);
            if(msg_handler !== void 0) {
                msg_handler({sender: username, text: msg})
            }

            res({msg: "message sent"})
        });
    },
    onmsg: function(f) {
        msg_handler = f;
    },
    ondisconnected: function(f) {
        disconnected_handler = f;
    },
    get connected() {
        return connected;
    }
}