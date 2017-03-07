define(function (require, exports, module) {
    "use strict";

    var AppInit = brackets.getModule("utils/AppInit"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        WorkspaceManager = brackets.getModule("view/WorkspaceManager"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        Mustache = brackets.getModule("thirdparty/mustache/mustache"),
        manager = require("src/TerminalManager"),
        toolbar = require("src/ToolbarManager"),
        Preferences = require("src/Preferences"),
        terminalHtml = require("text!src/views/terminal.html");

    var content = Mustache.render(terminalHtml, {
    });
    var $content = $(content);
    var panel = WorkspaceManager.createBottomPanel("brackets-terminal-x", $content, 100);

    function handleAction() {
        if (panel.isVisible()) {
            panel.hide();
        } else {
            panel.show();
        }
    }

    function getProjectPath() {
        if (ProjectManager.getProjectRoot()) {
            return ProjectManager.getProjectRoot().fullPath;
        }
        return "";
    }

    AppInit.htmlReady(function () {
        ExtensionUtils.loadStyleSheet(module, "node_modules/xterm/dist/xterm.css");
        ExtensionUtils.loadStyleSheet(module, "src/styles/style.css");
        manager.startConnection(Preferences.getPort());
        manager.on("connected", function (event) {
            var options = {
                cols: null,
                rows: null,
                projectRoot: getProjectPath(),
                shellPath: Preferences.getShellPath()
            };
            manager.createTerminal(options);
        });
        manager.on("created", function (event, terminalId) {
            var $terminal = $content.find("#terminal-container");
            var $panel = panel.$panel;
            $panel.on("panelResizeEnd", function () {
                manager.resize(terminalId);
            });
            manager.open($terminal.get()[0], terminalId);
            handleAction();
        });

        toolbar.createIcon();
        toolbar.on("clicked", function () {
            handleAction();
        });
        $content.on("click", ".close", function () {
            panel.hide();
        });
    });
});
