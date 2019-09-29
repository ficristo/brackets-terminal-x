import * as module from "module";

const ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
const EventDispatcher = brackets.getModule("utils/EventDispatcher");
const NodeDomain = brackets.getModule("utils/NodeDomain");
const terminalsDomain = new NodeDomain("terminals", ExtensionUtils.getModulePath(module, "node/TerminalsDomain"));

import { Terminal } from "xterm";
import * as fitAddon from "xterm/lib/addons/fit/fit";

const EOL = brackets.platform === "win" ? "\r\n" : "\n";

Terminal.applyAddon(fitAddon);

function Manager(this: any) {
    const self = this;
    terminalsDomain.on("data", function (event, termId, data) {
        self._terminals[termId].write(data);
    });
    terminalsDomain.on("exit", function (event, termId, exitCode) {
        console.error("[brackets-terminal-x] pty exited with code: ", exitCode);
    });
}
EventDispatcher.makeEventDispatcher(Manager.prototype);

Manager.prototype._terminals = {};
Manager.prototype._currentTermId = null;

Manager.prototype.createTerminal = function (options) {
    const self = this;
    self._terminals = self._terminals || {};

    const shellOptions = options.shell || {
        cols: null,
        rows: null,
        projectRoot: null,
        shellPath: null
    };
    const terminalOptions = options.terminal;
    terminalsDomain.exec("createTerminal", shellOptions)
        .done(function (termId) {
            self._newTerminal(termId, terminalOptions);
            self.trigger("created", termId);
        })
        .fail(function (err) {
            console.error("[brackets-terminal-x] failed to run terminals.createTerminal: ", err);
        });
};

Manager.prototype._newTerminal = function (termId, options) {
    const self = this;
    options = options || {};
    options.cursorBlink = true;
    const term = new Terminal(options);
    if (brackets.platform === "win") {
        term.setOption("windowsMode", true);
    }
    self._terminals[termId] = term;
    self._currentTermId = termId;

    term.on("resize", function (size) {
        const cols = size.cols;
        const rows = size.rows;

        terminalsDomain.exec("resize", termId, cols, rows);
    });

    term.on("title", function (title) {
        self.trigger("title", termId, title);
    });

    term.on("blur", function () {
        self.trigger("blurred", termId);
    });

    term.on("focus", function () {
        self.trigger("focused", termId);
    });

    term.on("data", function (data) {
        terminalsDomain.exec("message", termId, data);
    });
};

Manager.prototype.open = function (element, termId) {
    const self = this;

    const term = self._terminals[termId];
    term.open(element, false);
};

Manager.prototype.resize = function (termId, cols, rows) {
    const self = this;
    const term = self._terminals[termId];
    if (cols && rows) {
        term.resize(cols, rows);
    } else {
        term.fit();
    }
};

Manager.prototype.resizeAll = function (cols, rows) {
    const self = this;
    for (const termId in self._terminals) {
        if (self._terminals.hasOwnProperty(termId)) {
            self.resize(termId, cols, rows);
        }
    }
};

Manager.prototype.resizeCurrentTerm = function () {
    const self = this;
    self.resize(self._currentTermId);
};

Manager.prototype.focusCurrentTerm = function () {
    const self = this;
    const term = self._terminals[self._currentTermId];
    term.focus();
};

Manager.prototype.getElement = function (termId) {
    const self = this;
    const term = self._terminals[termId];
    return term.element;
};

Manager.prototype.goto = function (path) {
    const self = this;
    const termId = self._currentTermId;
    const data = "cd \"" + path + "\"" + EOL;
    terminalsDomain.exec("message", termId, data);
};

Manager.prototype.clear = function () {
    const self = this;
    const term = self._terminals[self._currentTermId];
    term.clear();
};

Manager.prototype.run = function (data) {
    const self = this;
    const termId = self._currentTermId;
    terminalsDomain.exec("message", termId, data + EOL);
};

Manager.prototype.close = function (termId) {
    const self = this;
    const term = self._terminals[termId];
    term.destroy();
    delete self._terminals[termId];
    terminalsDomain.exec("close", termId);
};

Manager.prototype.setCurrentTermId = function (termId) {
    const self = this;
    self._currentTermId = termId;
    const term = self._terminals[termId];
    term.focus();
};

Manager.prototype.hasTerminals = function () {
    const self = this;
    return Object.keys(self._terminals).length > 0;
};

const manager = new Manager();
export default manager;
