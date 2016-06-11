function loggerFactory(level) {
    return function(msg, ...args) {
        console.log(`${level}: ${msg}`, ...args);
    };
}

module.exports = {
    error: loggerFactory("error"),
    info: loggerFactory("info"),
    warn: loggerFactory("warn"),
    debug: loggerFactory("debug"),
}