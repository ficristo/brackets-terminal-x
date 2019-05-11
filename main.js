define(function (require, exports, module) {
    "use strict";

    var AppInit = brackets.getModule("utils/AppInit"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        WorkspaceManager = brackets.getModule("view/WorkspaceManager"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        Mustache = brackets.getModule("thirdparty/mustache/mustache"),
        CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        manager = require("src/TerminalManager"),
        toolbar = require("src/ToolbarManager"),
        Preferences = require("src/Preferences"),
        Strings = require("src/strings"),
        terminalsPanelHtml = require("text!src/views/terminals-panel.html"),
        terminalHeaderHtml = require("text!src/views/terminal-header.html"),
        terminalContentHtml = require("text!src/views/terminal-content.html"),
        PANEL_ID = "brackets-terminal-x",
        commandShow;

    var content = Mustache.render(terminalsPanelHtml, {
        Strings: Strings
    });
    var $content = $(content);
    var panel = WorkspaceManager.createBottomPanel(PANEL_ID, $content, 100);

    function handleAction(action) {
        switch (action) {
            case "check":
                commandShow.setChecked(true);
                break;
            case "uncheck":
                commandShow.setChecked(false);
                break;
            case "show":
                panel.show();
                commandShow.setChecked(true);
                break;
            case "hide":
                panel.hide();
                commandShow.setChecked(false);
                break;
            case "toggle":
            default:
                if (panel.isVisible()) {
                    panel.hide();
                    commandShow.setChecked(false);
                } else {
                    panel.show();
                    commandShow.setChecked(true);
                }
        }
    }

    function getProjectPath() {
        if (ProjectManager.getProjectRoot()) {
            return ProjectManager.getProjectRoot().fullPath;
        }
        return "";
    }

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

    function getBinary(language) {
        var mode = language.getMode();
        var prefs = Preferences.prefs;
        var binary = prefs.get("binaries")[mode];
        return binary;
    }

    function runScript() {
        manager.createTerminal(getOptions());
        handleAction("show");
        manager.one("after-created", function () {
            var doc = DocumentManager.getCurrentDocument();
            var fullPath = doc.file.fullPath;
            var binary = getBinary(doc.language);
            binary = binary ? binary + " " : "";
            manager.run(binary + fullPath);
        });
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

        var COMMAND_TERMINAL_SHOW = PANEL_ID + ".show";
        commandShow = CommandManager.register(Strings.MENU_SHOW, COMMAND_TERMINAL_SHOW, handleAction);

        var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        menu.addMenuItem(COMMAND_TERMINAL_SHOW);

        var COMMAND_TERMINAL_RUN_SCRIPT = PANEL_ID + ".run-script";
        var commandRun = CommandManager.register(
            Strings.CONTEXT_MENU_RUN_SCRIPT,
            COMMAND_TERMINAL_RUN_SCRIPT,
            runScript);
        var editorContextMenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
        editorContextMenu.addMenuItem(COMMAND_TERMINAL_RUN_SCRIPT);

        toolbar.createIcon();
        toolbar.on("clicked", function () {
            handleAction("toggle");
        });

        EditorManager.on("activeEditorChange." + PANEL_ID, function (event, newEditor, oldEditor) {
            var binary = false;
            if (newEditor) {
                binary = getBinary(newEditor.document.language);
            }
            commandRun.setEnabled(!!binary);
        });
    });

    AppInit.appReady(function () {
        manager.createTerminal(getOptions());

        $content.find(".nav-tabs .add-tab .add-terminal")
            .on("click", function () {
                manager.createTerminal(getOptions());
            });

        var $panel = panel.$panel;
        $panel.on("panelResizeEnd", function () {
            manager.resizeCurrentTerm();
        });

        manager.on("created", function (event, termId) {
            var header = Mustache.render(terminalHeaderHtml, {
                id: termId,
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

                manager.close(termId);
                var elem = $this.closest("li");
                var sibling = elem.prev().size() !== 0 ? elem.prev() : elem.next();
                sibling.find("a").click();

                var href = sibling.find("a").attr("href");
                var currentTermId = href.replace(/^#/, "");
                manager.setCurrentTermId(currentTermId);
                manager.resizeCurrentTerm();

                elem.remove();
                $terminalsContainer.find("#" + termId).remove();

                // Check for 2 because there is also the add-tab
                if ($content.find(".nav-container .nav-tabs li").size() === 2) {
                    $content.find(".nav-container .nav-tabs li .close").css("display", "none");
                }
            });
            $header.find("a[data-toggle='tab']")
                .on("shown", function (e) {
                    var href = $(e.target).attr("href");
                    var currentTermId = href.replace(/^#/, "");
                    manager.setCurrentTermId(currentTermId);
                    manager.resizeCurrentTerm();
                });
            $header.insertBefore("#brackets-terminal-x .nav-tabs .add-tab");

            var html = Mustache.render(terminalContentHtml, {
                id: termId
            });

            var $html = $(html);
            $html.addClass("active");
            manager.open($html.get()[0], termId);

            $terminalsContainer.append($html);
            manager.setCurrentTermId(termId);
            manager.resizeCurrentTerm();

            // Check for 2 because there is also the add-tab
            if ($content.find(".nav-container .nav-tabs li").size() > 2) {
                $content.find(".nav-container .nav-tabs li .close").css("display", "block");
            }

            manager.trigger("after-created");
        });
        manager.on("title", function (event, termId, title) {
            title = title.trim() || Strings.DEFAULT_TITLE;
            var header = $content.find("a[href='#" + termId + "'] > p:first-child");
            header.text(title);
            header.prop("title", title);
        });
        manager.on("blurred", function (event, termId) {
            var li = $content.find("a[href='#" + termId + "']").parent();
            li.removeClass("active");
        });
        manager.on("focused", function (event, termId) {
            var li = $content.find("a[href='#" + termId + "']").parent();
            li.addClass("active");
        });

        $content.on("click", ".toolbar > a.close", function () {
            handleAction("hide");
        });

        ProjectManager.on("projectOpen", function () {
            var projectPath = getProjectPath();
            if (projectPath) {
                manager.goto(projectPath);
            }
        });

        var prefs = Preferences.prefs;
        if (!prefs.get("collapsed")) {
            handleAction("show");
        }

        WorkspaceManager.on(WorkspaceManager.EVENT_WORKSPACE_UPDATE_LAYOUT, function (event, editorAreaHeight) {
            if (editorAreaHeight > 0 && manager.hasTerminals()) {
                manager.resizeCurrentTerm();
            }
        });

        WorkspaceManager.on(WorkspaceManager.EVENT_WORKSPACE_PANEL_SHOWN, function (event, panelId) {
            if (panelId === PANEL_ID) {
                prefs.set("collapsed", false);
                manager.focusCurrentTerm();
                handleAction("check");
            }
        });
        WorkspaceManager.on(WorkspaceManager.EVENT_WORKSPACE_PANEL_HIDDEN, function (event, panelId) {
            if (panelId === PANEL_ID) {
                prefs.set("collapsed", true);
                handleAction("uncheck");
            }
        });
    });
});
