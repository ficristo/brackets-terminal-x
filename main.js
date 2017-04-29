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
        Strings = require("src/strings"),
        terminalsPanelHtml = require("text!src/views/terminals-panel.html"),
        terminalHeaderHtml = require("text!src/views/terminal-header.html"),
        terminalContentHtml = require("text!src/views/terminal-content.html");

    var content = Mustache.render(terminalsPanelHtml, {
        Strings: Strings
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
        $content.find("#clear").on("click", function () {
            manager.clear();
        });
        $content.find("#cdCurrentProject").on("click", function () {
            var projectPath = getProjectPath();
            if (projectPath) {
                manager.goto(projectPath);
            }
        });
    });

    AppInit.appReady(function () {
        manager.startConnection(Preferences.getPort());
        manager.on("connected", function (event) {
            var shellPrefs = Preferences.getShell();
            var options = {
                cols: null,
                rows: null,
                projectRoot: getProjectPath(),
                shellPath: shellPrefs.shellPath,
                shellArgs: shellPrefs.shellArgs
            };
            manager.createTerminal(options);
        });
        manager.on("created", function (event, terminalId) {
            var $navTabs = $content.find(".nav-tabs");
            var header = Mustache.render(terminalHeaderHtml, {
                id: terminalId,
                title: "Terminal"
            });
            $navTabs.append(header);

            var html = Mustache.render(terminalContentHtml, {
                id: terminalId
            });

            var $html = $(html);
            manager.open($html.get()[0], terminalId);

            var $terminalsContainer = $content.find("#terminals-container");
            $terminalsContainer.append($html);

            var $panel = panel.$panel;
            $panel.on("panelResizeEnd", function () {
                manager.resize(terminalId);
            });

            handleAction();
        });
        manager.on("title", function (event, terminalId, title) {
            var header = $content.find("a[href='#" + terminalId + "'] > p:first-child");
            header.text(title);
            header.prop("title", title);
        });

        toolbar.createIcon();
        toolbar.on("clicked", function () {
            handleAction();
        });
        $content.on("click", ".toolbar > a.close", function () {
            panel.hide();
        });

        ProjectManager.on("projectOpen", function () {
            var projectPath = getProjectPath();
            if (projectPath) {
                manager.goto(projectPath);
            }
        });

        WorkspaceManager.on(WorkspaceManager.EVENT_WORKSPACE_UPDATE_LAYOUT, function (event, editorAreaHeight) {
            if (editorAreaHeight > 0) {
                manager.resizeAll();
            }
        });
    });
});
