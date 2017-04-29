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
        terminalContentHtml = require("text!src/views/terminal-content.html"),
        PANEL_ID = "brackets-terminal-x";

    var content = Mustache.render(terminalsPanelHtml, {
        Strings: Strings
    });
    var $content = $(content);
    var panel = WorkspaceManager.createBottomPanel(PANEL_ID, $content, 100);

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

            $content.find(".nav-tabs .add-tab .add-terminal")
                .on("click", function () {
                    manager.createTerminal(options);
                });
        });
        manager.on("created", function (event, terminalId) {
            var header = Mustache.render(terminalHeaderHtml, {
                id: terminalId,
                title: "Terminal"
            });
            var $header = $(header);

            $("#brackets-terminal-x .nav-container .nav-tabs li").removeClass("active");

            $header.addClass("active");
            $header.insertBefore("#brackets-terminal-x .nav-tabs .add-tab");

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

        var prefs = Preferences.prefs;
        if (!prefs.get("collapsed")) {
            panel.show();
        }

        WorkspaceManager.on(WorkspaceManager.EVENT_WORKSPACE_UPDATE_LAYOUT, function (event, editorAreaHeight) {
            if (editorAreaHeight > 0) {
                manager.resizeAll();
            }
        });

        WorkspaceManager.on(WorkspaceManager.EVENT_WORKSPACE_PANEL_SHOWN, function (event, panelId) {
            if (panelId === PANEL_ID) {
                prefs.set("collapsed", false);
            }
        });
        WorkspaceManager.on(WorkspaceManager.EVENT_WORKSPACE_PANEL_HIDDEN, function (event, panelId) {
            if (panelId === PANEL_ID) {
                prefs.set("collapsed", true);
            }
        });
    });
});
