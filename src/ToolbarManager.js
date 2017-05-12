define(function (require, exports, module) {
    "use strict";

    var EventDispatcher = brackets.getModule("utils/EventDispatcher"),
        Mustache = brackets.getModule("thirdparty/mustache/mustache"),
        terminalIconHtml = require("text!src/views/terminal-icon.html");

    function Manager() {
    }
    EventDispatcher.makeEventDispatcher(Manager.prototype);

    Manager.prototype.createIcon = function () {
        var self = this;

        var content = Mustache.render(terminalIconHtml, {
        });
        $(content).appendTo($("#main-toolbar .buttons"));
        this._$icon = $("#brackets-terminal-x-icon");
        this._$icon.on("click", function () {
            self.trigger("clicked");
        });
    };

    var manager = new Manager();
    module.exports = manager;
});
