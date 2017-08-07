define(function (require, exports, module) {
    "use strict";

    var ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        EventDispatcher = brackets.getModule("utils/EventDispatcher"),
        NodeDomain = brackets.getModule("utils/NodeDomain"),
        terminalsDomain = new NodeDomain("terminals", ExtensionUtils.getModulePath(module, "node/TerminalsDomain")),

        Terminal = require("node_modules/xterm/dist/xterm");

    require([
        "node_modules/xterm/dist/addons/fit/fit"
    ]);

    function Manager() {
        var self = this;
        terminalsDomain.on("data", function (event, termId, data) {
            self._terminals[termId].write(data);
        });
    }
    EventDispatcher.makeEventDispatcher(Manager.prototype);

    Manager.prototype._port = undefined;
    Manager.prototype._terminals = {};
    Manager.prototype._currentTermId = null;

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

        term.on("data", function (data) {
            terminalsDomain.exec("message", termId, data);
        });
    };

    Manager.prototype.open = function (element, termId) {
        var self = this;

        var term = self._terminals[termId];
        term.open(element, false);
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
            termId = self._currentTermId,
            eol = brackets.platform === "win" ? "\r\n" : "\n",
            data = "cd \"" + path + "\"" + eol;
        terminalsDomain.exec("message", termId, data);
    };

    Manager.prototype.clear = function () {
        var self = this,
            term = self._terminals[self._currentTermId];
        term.clear();
    };

    Manager.prototype.close = function (termId) {
        var self = this,
            term = self._terminals[termId];
        term.destroy();
        delete self._terminals[termId];
        terminalsDomain.exec("close", termId);
    };

    Manager.prototype.setCurrentTermId = function (termId) {
        var self = this;
        self._currentTermId = termId;
        var term = self._terminals[termId];
        term.focus();
    };

    Manager.prototype.hasTerminals = function () {
        var self = this;
        return Object.keys(self._terminals).length > 0;
    };

    var manager = new Manager();
    module.exports = manager;
});
