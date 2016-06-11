class MessageBuilder{
    constructor(head) {
        if(!(head && typeof head === "string" && head.length === 4))
            throw new Error("message head is not a 4 char string")
        this.head = head;
        this.items = [];
    }

    static create(head) {
        return new MessageBuilder(head);
    }

    add(item) {
        if(item && typeof item === "string") {
            this.items.push(`${item.length}:${item}`)
        }
        return this;
    }

    build() {
        var msg = this.head + this.items.join("");
        return msg.length + ':' + msg;
    }

    static createActionConn(username) {
        MessageBuilder.create("conn")
    }
}

function nextStr(str, idx) {
    var colIdx = str.indexOf(":", idx);
    if(colIdx === -1) { // error
        return void 0;
    }
    var len = parseInt(str.slice(idx, colIdx));
    // if len is not a parsable number string
    if(isNaN(len)) return void 0;

    // omit the colon in following slice call
    colIdx++;

    // empty content case
    if(colIdx === str.length)
        if(len === 0)
            return {
                value: "",
                remain: ""
            };
        else // it's an error to have empty content with non-zero length value
            return void 0;

    var endPosition = colIdx + len;
    // check if colIdx + len is in range, js slice will return even if stopIdx > length
    if(endPosition > str.length)
        return void 0;

    return {
        value: str.slice(colIdx, endPosition),
        position: endPosition
    };
}

function parseMessage(msg) {
    // check msg length
    if(msg.length < 4) throw new Error("message too short: " + msg);

    var value = msg.slice(0, 4);
    var position = 4;

    var vals = [];
    vals.push(value);

    var r = nextStr(msg, position);
    while(r && position !== msg.length) {
        var {value, position} = r;
        vals.push(value);

        r = nextStr(msg, position);
    }
    if(position !== msg.length)
        logutil.warn("Some content is not parsed in message " + msg);
    return vals;
}

/* specialized builders */

function createConn(name) {
    return MessageBuilder.create("conn")
        .add(name).build();
}

function createDisc(session) {
    return MessageBuilder.create("disc")
        .add(session).build();
}

function createSend(session, msg) {
    return MessageBuilder.create("send")
        .add(session).add(msg).build()
}

function createBeat() {
    return MessageBuilder.create("beat").build()
}

function createSucc(msg) {
    return MessageBuilder.create("succ")
        .add(msg).build()
}

function createFail(msg) {
    return MessageBuilder.create("fail")
        .add(msg).build();
}

function createServ(sender, msg) {
    return MessageBuilder.create("serv")
        .add(sender).add(msg).build()
}


/* specialized parsers */

function zipPropVals(props, vals) {
    var o = {};
    for(var i = 0; i < props.length; ++i) {
        o[props[i]] = vals[i]
    }
    return o;
}

function parseConn(msg) {
    var msgs = parseMessage(msg);
    return zipPropVals(["action", "name"], msgs);
}

function parseDisc(msg) {
    var msgs = parseMessage(msg);
    return zipPropVals(["action", "session"], msgs);
}

function parseSend(msg) {
    var msgs = parseMessage(msg);
    return zipPropVals(["action", "session", "text"], msgs);
}

function parseBeat(msg) {
    var msgs = parseMessage(msg);
    return zipPropVals(["action"], msgs);
}

function parseSucc(msg) {
    var msgs = parseMessage(msg);
    return zipPropVals(["action", "msg"], msgs);
}

function parseFail(msg) {
    var msgs = parseMessage(msg);
    return zipPropVals(["action", "msg"], msgs);
}

function parseServ(msg) {
    var msgs = parseMessage(msg);
    return zipPropVals(["action", "sender", "text"], msgs);
}

/**
 * MessageBuffer is used to buffer chuncks of raw data
 * and produce message entities
 */
class MessageBuffer {
    constructor() {
        this.buf = "";
    }

    static create() {
        return new MessageBuffer();
    }

    add(data) {
        if(data && typeof data === "string") {
            this.buf += data;
        }
    }

    get() {
        var r = nextStr(this.buf, 0)
        if(r) {
            var {value, position} = r;
            this.buf = this.buf.slice(position);
            if(value.length < 4) {
                return {
                    action: "invalid"
                }
            }
            return parsers[value.slice(0,4)](value);
        }
        return void 0;
    }
}

var parsers = {
        conn: parseConn,
        disc: parseDisc,
        send: parseSend,
        beat: parseBeat,
        succ: parseSucc,
        fail: parseFail,
        serv: parseServ
    },
    builders = {
        conn: createConn,
        disc: createDisc,
        send: createSend,
        beat: createBeat,
        succ: createSucc,
        fail: createFail,
        serv: createServ
    }

module.exports = {
    MessageBuilder,
    parseMessage,
    MessageBuffer,
    parsers,
    builders
}