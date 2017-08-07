/*eslint-env node */
"use strict";

var pty = require("node-pty"),
    shellPath = process.platform === "win32"
        ? "C:\\Windows\\system32\\cmd.exe"
        : "bash",
    terminals = {},
    gDomainManager;

function cmdCreateTerminal(options, cb) {
    var shell = options.shellPath || shellPath;
    var args = options.shellArgs || [];
    var term = pty.spawn(shell, args, {
        name: "xterm-256color",
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd: options.projectRoot || process.env.PWD,
        env: process.env
    });

    terminals[term.pid] = term;
    term.on("data", function (data) {
        gDomainManager.emitEvent("terminals", "data", [term.pid, data]);
    });

    cb(null, term.pid);
}

function cmdResize(termId, cols, rows) {
    var term = terminals[termId];
    term.resize(cols, rows);
}

function cmdMessage(termId, message) {
    var term = terminals[termId];
    term.write(message);
}

function cmdClose(termId) {
    var term = terminals[termId];
    process.kill(term.pid);
    // Clean things up
    delete terminals[term.pid];
}

function init(domainManager) {
    if (!domainManager.hasDomain("terminals")) {
        domainManager.registerDomain("terminals", {major: 0, minor: 1});
    }
    gDomainManager = domainManager;

    domainManager.registerCommand(
        "terminals",        // domain name
        "createTerminal",   // command name
        cmdCreateTerminal,  // command handler function
        true,               // this command is asynchronous in Node
        "Spawn a new terminal",
        [
            {
                name: "options",
                type: "object",
                description: "The options to pass to spawn a new terminal"
            }
        ],
        [
            {
                name: "pid",
                type: "number",
                description: "The id of the spawned terminal"
            }
        ]
    );
    domainManager.registerCommand(
        "terminals",        // domain name
        "resize",           // command name
        cmdResize,          // command handler function
        false,              // this command is asynchronous in Node
        "Resize a terminal",
        [
            {
                name: "pid",
                type: "number",
                description: "The id of the terminal"
            },
            {
                name: "cols",
                type: "number",
                description: "The number of cols"
            },
            {
                name: "rows",
                type: "number",
                description: "The number of rows"
            }
        ],
        []
    );
    domainManager.registerCommand(
        "terminals",        // domain name
        "message",          // command name
        cmdMessage,         // command handler function
        true,               // this command is asynchronous in Node
        "Send data to a terminal",
        [
            {
                name: "pid",
                type: "number",
                description: "The id of the terminal"
            },
            {
                name: "message",
                type: "string",
                description: "The data sent to the terminal"
            }
        ],
        []
    );
    domainManager.registerCommand(
        "terminals",        // domain name
        "close",            // command name
        cmdClose,           // command handler function
        true,               // this command is asynchronous in Node
        "Close a terminal",
        [
            {
                name: "pid",
                type: "number",
                description: "The id of the terminal"
            }
        ],
        []
    );

    domainManager.registerEvent(
        "terminals",        // domain name
        "data",             // event name
        [
            {
                name: "pid",
                type: "number",
                description: "The id of the spawned terminal"
            },
            {
                name: "message",
                type: "string",
                description: "The message"
            }
        ]);
}

exports.init = init;
