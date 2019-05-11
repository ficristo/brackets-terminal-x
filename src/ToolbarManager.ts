const EventDispatcher = brackets.getModule("utils/EventDispatcher");
const Mustache = brackets.getModule("thirdparty/mustache/mustache");
import terminalIconHtml = require("text!./views/terminal-icon.html");

function Manager() {
    // Do nothing.
}
EventDispatcher.makeEventDispatcher(Manager.prototype);

Manager.prototype.createIcon = function () {
    const self = this;

    const content = Mustache.render(terminalIconHtml, {
    });
    $(content).appendTo($("#main-toolbar .buttons"));
    this._$icon = $("#brackets-terminal-x-icon");
    this._$icon.on("click", function () {
        self.trigger("clicked");
    });
};

const manager = new Manager();
export = manager;
