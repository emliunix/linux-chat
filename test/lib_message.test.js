const {assert, expect} = require("chai");
const message = require("../lib/message.js");

function throwsError(fn) {
    var err = void 0;
    try {
        fn();
    } catch(_err) {
        err = _err;
    }
    assert.isTrue(!!err, "should throw an error");
}

describe("Message related programs", function() {
    describe("MessageBuilder", function() {
        it("should build a message", function() {
            var msg = message.MessageBuilder.create("conn")
                .add("myname").add("morethings").build();
            assert.strictEqual("25:conn6:myname10:morethings", msg)
        })

        throwsError(message.MessageBuilder.create.bind(void 0, "connnn"));
        throwsError(message.MessageBuilder.create.bind(void 0, ""))
    })

    describe("parseMessage", function() {
        it("should parse message", function() {
            var result = message.parseMessage("conn6:myname10:morethings")
            assert.deepEqual(result, ["conn", "myname", "morethings"]);
        })

        throwsError(message.parseMessage.bind(void 0, ""))
        throwsError(message.parseMessage.bind(void 0, "connasldjf4:text"))
        throwsError(message.parseMessage.bind(void 0, "conn4:text5:1234"))
        throwsError(message.parseMessage.bind(void 0, "conn4:text5:123456"))
    })

    describe("pasers", function() {
        it("should parse conn", function name() {
            assert.deepEqual(message.parsers["conn"]("conn4:name"), {
                action: "conn",
                name: "name"
            })
        });
        it("should parse disc", function name() {
            assert.deepEqual(message.parsers["disc"]("disc7:session"), {
                action: "disc",
                session: "session"
            })
        });
        it("should parse send", function name() {
            assert.deepEqual(message.parsers["send"]("send7:session4:text"), {
                action: "send",
                session: "session",
                text: "text"
            })
        });
        it("should parse beat", function name() {
            assert.deepEqual(message.parsers["beat"]("beat"), {
                action: "beat"
            })
        });
        it("should parse succ", function name() {
            assert.deepEqual(message.parsers["succ"]("succ7:message"), {
                action: "succ",
                msg: "message"
            })
        });
        it("should parse fail", function name() {
            assert.deepEqual(message.parsers["fail"]("fail7:message"), {
                action: "fail",
                msg: "message"
            })
        });
        it("should parse serv", function name() {
            assert.deepEqual(message.parsers["serv"]("serv6:sender4:text"), {
                action: "serv",
                sender: "sender",
                text: "text"
            })
        });
    });

    describe("specific builders to build raw message", function() {
        it("should build conn", function name() {
            assert.deepEqual(message.builders["conn"]("name"), "10:conn4:name");
        });
        it("should build disc", function name() {
            assert.deepEqual(message.builders["disc"]("session"), "13:disc7:session");
        });
        it("should build send", function name() {
            assert.deepEqual(message.builders["send"]("session", "text"), "19:send7:session4:text");
        });
        it("should build beat", function name() {
            assert.deepEqual(message.builders["beat"](), "4:beat");
        });
        it("should build succ", function name() {
            assert.deepEqual(message.builders["succ"]("message"), "13:succ7:message")
        });
        it("should build fail", function name() {
            assert.deepEqual(message.builders["fail"]("message"), "13:fail7:message")
        });
        it("should build serv", function name() {
            assert.deepEqual(message.builders["serv"]("sender", "text"), "18:serv6:sender4:text")
        });
    });
});