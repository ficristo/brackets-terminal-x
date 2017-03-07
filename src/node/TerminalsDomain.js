/*eslint-env node */
"use strict";

var url = require("url"),
    pty = require("node-pty"),
    WebSocketServer = require("ws").Server,

    shellPath = process.platform === "win32"
        ? "C:\\Windows\\system32\\cmd.exe"
        : "bash",
    terminals = {},
    logs = {};

function cmdCreateTerminal(options, cb) {
    var shell = options.shellPath || shellPath;
    var args = options.shellArgs || [];
    var term = pty.spawn(shell, args, {
        name: "xterm-color",
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd: options.projectRoot || process.env.PWD,
        env: process.env
    });

    terminals[term.pid] = term;
    logs[term.pid] = "";
    term.on("data", function (data) {
        logs[term.pid] += data;
    });

    cb(null, term.pid);
}

function cmdStartConnection(port, cb) {
    var wsServer = new WebSocketServer({ port: port });

    wsServer.on("connection", function connection(ws) {
        var query = url.parse(ws.upgradeReq.url, true).query;
        var termId = parseInt(query.pid, 10);
        var term = terminals[termId];

        ws.send(logs[term.pid]);

        term.on("data", function (data) {
            try {
                ws.send(data);
            } catch (ex) {
                // The WebSocket is not open, ignore
            }
        });
        ws.on("message", function (msg) {
            term.write(msg);
        });
        ws.on("close", function () {
            process.kill(term.pid);
            // Clean things up
            delete terminals[term.pid];
        });
    }).on("error", function (e) {
        console.error("Connection error:");
        console.error(e);
    });

    cb(null);
}

function cmdResize(terminalId, cols, rows) {
    var term = terminals[terminalId];
    term.resize(cols, rows);
}

function init(domainManager) {
    if (!domainManager.hasDomain("terminals")) {
        domainManager.registerDomain("terminals", {major: 0, minor: 1});
    }
    domainManager.registerCommand(
        "terminals",        // domain name
        "startConnection",  // command name
        cmdStartConnection, // command handler function
        true,               // this command is asynchronous in Node
        "Start a socket connection",
        [
            {
                name: "port",
                type: "number",
                description: "The port to connect"
            }
        ],
        []
    );
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
}

exports.init = init;
