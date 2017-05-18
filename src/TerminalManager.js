define(function (require, exports, module) {
    "use strict";

    var ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        EventDispatcher = brackets.getModule("utils/EventDispatcher"),
        NodeDomain = brackets.getModule("utils/NodeDomain"),
        terminalsDomain = new NodeDomain("terminals", ExtensionUtils.getModulePath(module, "node/TerminalsDomain")),

        Terminal = require("node_modules/xterm/dist/xterm");

    require([
        "node_modules/xterm/dist/addons/attach/attach",
        "node_modules/xterm/dist/addons/fit/fit"
    ]);

    function Manager() {
    }
    EventDispatcher.makeEventDispatcher(Manager.prototype);

    Manager.prototype._port = undefined;
    Manager.prototype._terminals = {};
    Manager.prototype._currentTermId = null;

    Manager.prototype.startConnection = function (port) {
        var self = this;
        self._port = port;
        terminalsDomain.exec("startConnection", port)
            .done(function () {
                self.trigger("connected");
            })
            .fail(function (err) {
                console.error("[brackets-terminal-x] failed to run terminals.startConnection: ", err);
            });
    };

    Manager.prototype.createTerminal = function (options) {
        var self = this;
        self._terminals = self._terminals || {};

        options = options || {
            cols: null,
            rows: null,
            projectRoot: null,
            shellPath: null
        };
        terminalsDomain.exec("createTerminal", options)
            .done(function (termId) {
                self._newTerminal(termId);
                self.trigger("created", termId);
            })
            .fail(function (err) {
                console.error("[brackets-terminal-x] failed to run terminals.createTerminal: ", err);
            });
    };

    Manager.prototype._newTerminal = function (termId) {
        var self = this,
            term = new Terminal({
                cursorBlink: true
            });
        self._terminals[termId] = term;
        self._currentTermId = termId;

        term.on("resize", function (size) {
            var cols = size.cols,
                rows = size.rows;

            terminalsDomain.exec("resize", termId, cols, rows);
        });

        term.on("title", function (title) {
            self.trigger("title", termId, title);
        });
    };

    Manager.prototype.open = function (element, termId) {
        var self = this;
        var protocol = (window.location.protocol === "https:") ? "wss://" : "ws://";
        var url = protocol + "localhost:" + self._port + "/?pid=" + termId;
        var socket = new WebSocket(url);

        var term = self._terminals[termId];
        term.open(element, false);

        socket.onopen = function () {
            term.attach(socket);
            term.fit();
        };
        socket.onclose = function () {
            // Nothing to do.
        };
        socket.onerror = function (err) {
            console.error(err);
        };
    };

    Manager.prototype.resize = function (termId, cols, rows) {
        var self = this,
            term = self._terminals[termId];
        if (cols && rows) {
            term.resize(cols, rows);
        } else {
            term.fit();
        }
    };

    Manager.prototype.resizeAll = function (cols, rows) {
        var self = this;
        for (var termId in self._terminals) {
            if (self._terminals.hasOwnProperty(termId)) {
                self.resize(termId, cols, rows);
            }
        }
    };

    Manager.prototype.resizeCurrentTerm = function () {
        var self = this;
        self.resize(self._currentTermId);
    };

    Manager.prototype.focusCurrentTerm = function () {
        var self = this,
            term = self._terminals[self._currentTermId];
        term.focus();
    };

    Manager.prototype.getElement = function (termId) {
        var self = this,
            term = self._terminals[termId];
        return term.element;
    };

    Manager.prototype.goto = function (path) {
        var self = this,
            term = self._terminals[self._currentTermId];
        var eol = brackets.platform === "win" ? "\r\n" : "\n";
        term.socket.send("cd \"" + path + "\"" + eol);
    };

    Manager.prototype.clear = function () {
        var self = this,
            term = self._terminals[self._currentTermId];
        term.clear();
    };

    Manager.prototype.close = function (termId) {
        var self = this,
            term = self._terminals[termId];
        term.socket.close();
        term.destroy();
        delete self._terminals[termId];
    };

    Manager.prototype.setCurrentTermId = function (termId) {
        var self = this;
        self._currentTermId = termId;
        var term = self._terminals[termId];
        term.focus();
    };

    var manager = new Manager();
    module.exports = manager;
});
