import * as pty from "node-pty-prebuilt";

const terminals: { [pid: number]: pty.IPty } = {};
let gDomainManager;

function cmdCreateTerminal(options, cb) {
    const shell = options.shellPath;
    if (!shell) {
        cb("Shell path must be set.");
        return;
    }

    const args = options.shellArgs || [];
    const term = pty.spawn(shell, args, {
        name: "xterm-256color",
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd: options.projectRoot || process.env.PWD,
        env: process.env as any
    });

    terminals[term.pid] = term;
    term.on("data", function (data) {
        gDomainManager.emitEvent("terminals", "data", [term.pid, data]);
    });
    term.on("exit", function (code) {
        gDomainManager.emitEvent("terminals", "exit", [term.pid, code]);
    });

    cb(null, term.pid);
}

function cmdResize(termId, cols, rows) {
    const term = terminals[termId];
    term.resize(cols, rows);
}

function cmdMessage(termId, message) {
    const term = terminals[termId];
    term.write(message);
}

function cmdClose(termId) {
    const term = terminals[termId];
    // Clean things up
    delete terminals[term.pid];
    term.kill();
}

export function init(domainManager) {
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

    domainManager.registerEvent(
        "terminals",        // domain name
        "exit",             // event name
        [
            {
                name: "pid",
                type: "number",
                description: "The id of the spawned terminal"
            },
            {
                name: "exit",
                type: "number",
                description: "The exit code"
            }
        ]);
}
