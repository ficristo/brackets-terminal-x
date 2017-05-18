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
        ExtensionUtils.loadStyleSheet(module, "src/styles/nav-tabs-override.less");
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

        toolbar.createIcon();
        toolbar.on("clicked", function () {
            handleAction();
        });
    });

    function getOptions() {
        var shellPrefs = Preferences.getShell();
        var options = {
            cols: null,
            rows: null,
            projectRoot: getProjectPath(),
            shellPath: shellPrefs.shellPath,
            shellArgs: shellPrefs.shellArgs
        };
        return options;
    }

    AppInit.appReady(function () {
        manager.startConnection(Preferences.getPort());
        manager.on("connected", function (event) {
            manager.createTerminal(getOptions());

            $content.find(".nav-tabs .add-tab .add-terminal")
                .on("click", function () {
                    manager.createTerminal(getOptions());
                });

            var $panel = panel.$panel;
            $panel.on("panelResizeEnd", function () {
                manager.resizeCurrentTerm();
            });
        });
        manager.on("created", function (event, terminalId) {
            var header = Mustache.render(terminalHeaderHtml, {
                id: terminalId,
                title: Strings.DEFAULT_TITLE
            });
            var $header = $(header);
            var $terminalsContainer = $content.find("#terminals-container");

            $content.find(".nav-container .nav-tabs li").removeClass("active");
            $content.find(".tab-pane").removeClass("active");

            $header.addClass("active");
            $header.find(".close").on("click", function () {
                // eslint-disable-next-line no-invalid-this
                var $this = $(this);

                manager.close(terminalId);
                var elem = $this.closest("li");
                var sibling = elem.prev().size() !== 0 ? elem.prev() : elem.next();
                sibling.find("a").click();

                var href = sibling.find("a").attr("href");
                var termId = href.replace(/^#/, "");
                manager.setCurrentTermId(termId);

                elem.remove();
                $terminalsContainer.find("#" + terminalId).remove();

                // Check for 2 because there is also the add-tab
                if ($content.find(".nav-container .nav-tabs li").size() === 2) {
                    $content.find(".nav-container .nav-tabs li .close").css("display", "none");
                }
            });
            $header.find("a[data-toggle='tab']")
                .on("shown", function (e) {
                    var href = $(e.target).attr("href");
                    var termId = href.replace(/^#/, "");
                    manager.setCurrentTermId(termId);
                    manager.resizeCurrentTerm();
                });
            $header.insertBefore("#brackets-terminal-x .nav-tabs .add-tab");

            var html = Mustache.render(terminalContentHtml, {
                id: terminalId
            });

            var $html = $(html);
            $html.addClass("active");
            manager.open($html.get()[0], terminalId);

            $terminalsContainer.append($html);

            // Check for 2 because there is also the add-tab
            if ($content.find(".nav-container .nav-tabs li").size() > 2) {
                $content.find(".nav-container .nav-tabs li .close").css("display", "block");
            }
        });
        manager.on("title", function (event, terminalId, title) {
            title = title.trim() || Strings.DEFAULT_TITLE;
            var header = $content.find("a[href='#" + terminalId + "'] > p:first-child");
            header.text(title);
            header.prop("title", title);
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
                manager.resizeCurrentTerm();
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
