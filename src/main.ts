import * as module from "module";

const AppInit = brackets.getModule("utils/AppInit");
const ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
const WorkspaceManager = brackets.getModule("view/WorkspaceManager");
const ProjectManager = brackets.getModule("project/ProjectManager");
const Mustache = brackets.getModule("thirdparty/mustache/mustache");
const CommandManager = brackets.getModule("command/CommandManager");
const Menus = brackets.getModule("command/Menus");
const DocumentManager = brackets.getModule("document/DocumentManager");
const EditorManager = brackets.getModule("editor/EditorManager");
import manager from "./TerminalManager";
import toolbar from "./ToolbarManager";
import * as Preferences from "./Preferences";
import Strings from "./strings";
import * as terminalsPanelHtml from "text!./views/terminals-panel.html";
import * as terminalHeaderHtml from "text!./views/terminal-header.html";
import * as terminalContentHtml from "text!./views/terminal-content.html";
const PANEL_ID = "brackets-terminal-x";
let commandShow;

const content = Mustache.render(terminalsPanelHtml, {
    Strings: Strings
});
const $content = $(content);
const panel = WorkspaceManager.createBottomPanel(PANEL_ID, $content, 100);

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
    const shellPrefs = Preferences.getShell();
    const prefs = Preferences.prefs;
    const options = {
        shell: {
            cols: null,
            rows: null,
            projectRoot: getProjectPath(),
            shellPath: shellPrefs.shellPath,
            shellArgs: shellPrefs.shellArgs
        },
        terminal: {
            rendererType: prefs.get("rendererType")
        }
    };
    return options;
}

function getBinary(language) {
    const mode = language.getMode();
    const prefs = Preferences.prefs;
    const binary = prefs.get("binaries")[mode];
    return binary;
}

function runScript() {
    manager.createTerminal(getOptions());
    handleAction("show");
    manager.one("after-created", function () {
        const doc = DocumentManager.getCurrentDocument();
        const fullPath = doc.file.fullPath;
        let binary = getBinary(doc.language);
        binary = binary ? binary + " " : "";
        manager.run(binary + fullPath);
    });
}

AppInit.htmlReady(function () {
    ExtensionUtils.loadStyleSheet(module, "../node_modules/xterm/dist/xterm.css");
    ExtensionUtils.loadStyleSheet(module, "./styles/nav-tabs-override.less");
    ExtensionUtils.loadStyleSheet(module, "./styles/style.css");
    $content.find("#clear").on("click", function () {
        manager.clear();
    });
    $content.find("#cdCurrentProject").on("click", function () {
        const projectPath = getProjectPath();
        if (projectPath) {
            manager.goto(projectPath);
        }
    });

    const COMMAND_TERMINAL_SHOW = PANEL_ID + ".show";
    commandShow = CommandManager.register(Strings.MENU_SHOW, COMMAND_TERMINAL_SHOW, handleAction);

    const menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
    menu.addMenuItem(COMMAND_TERMINAL_SHOW);

    const COMMAND_TERMINAL_RUN_SCRIPT = PANEL_ID + ".run-script";
    const commandRun = CommandManager.register(
        Strings.CONTEXT_MENU_RUN_SCRIPT,
        COMMAND_TERMINAL_RUN_SCRIPT,
        runScript);
    const editorContextMenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
    editorContextMenu.addMenuItem(COMMAND_TERMINAL_RUN_SCRIPT);

    toolbar.createIcon();
    toolbar.on("clicked", function () {
        handleAction("toggle");
    });

    EditorManager.on("activeEditorChange." + PANEL_ID, function (event, newEditor, oldEditor) {
        let binary = false;
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

    const $panel = panel.$panel;
    $panel.on("panelResizeEnd", function () {
        manager.resizeCurrentTerm();
    });

    manager.on("created", function (event, termId) {
        const header = Mustache.render(terminalHeaderHtml, {
            id: termId,
            title: Strings.DEFAULT_TITLE
        });
        const $header = $(header);
        const $terminalsContainer = $content.find("#terminals-container");

        $content.find(".nav-container .nav-tabs li").removeClass("active");
        $content.find(".tab-pane").removeClass("active");

        $header.addClass("active");
        $header.find(".close").on("click", function (this: any) {
            // eslint-disable-next-line no-invalid-this
            const $this = $(this);

            manager.close(termId);
            const elem = $this.closest("li");
            const sibling = elem.prev().length !== 0 ? elem.prev() : elem.next();
            sibling.find("a").click();

            const href = sibling.find("a").attr("href");
            const currentTermId = href.replace(/^#/, "");
            manager.setCurrentTermId(currentTermId);
            manager.resizeCurrentTerm();

            elem.remove();
            $terminalsContainer.find("#" + termId).remove();

            // Check for 2 because there is also the add-tab
            if ($content.find(".nav-container .nav-tabs li").length === 2) {
                $content.find(".nav-container .nav-tabs li .close").css("display", "none");
            }
        });
        $header.find("a[data-toggle='tab']")
            .on("shown", function (e) {
                const href = $(e.target).attr("href");
                const currentTermId = href.replace(/^#/, "");
                manager.setCurrentTermId(currentTermId);
                manager.resizeCurrentTerm();
            });
        $header.insertBefore("#brackets-terminal-x .nav-tabs .add-tab");

        const html = Mustache.render(terminalContentHtml, {
            id: termId
        });

        const $html = $(html);
        $html.addClass("active");
        $terminalsContainer.append($html);
        manager.open($html.get()[0], termId);

        manager.setCurrentTermId(termId);
        manager.resizeCurrentTerm();

        // Check for 2 because there is also the add-tab
        if ($content.find(".nav-container .nav-tabs li").length > 2) {
            $content.find(".nav-container .nav-tabs li .close").css("display", "block");
        }

        manager.trigger("after-created");
    });
    manager.on("title", function (event, termId, title) {
        title = title.trim() || Strings.DEFAULT_TITLE;
        const header = $content.find("a[href='#" + termId + "'] > p:first-child");
        header.text(title);
        header.prop("title", title);
    });
    manager.on("blurred", function (event, termId) {
        const li = $content.find("a[href='#" + termId + "']").parent();
        li.removeClass("active");
    });
    manager.on("focused", function (event, termId) {
        const li = $content.find("a[href='#" + termId + "']").parent();
        li.addClass("active");
    });

    $content.on("click", ".toolbar > a.close", function () {
        handleAction("hide");
    });

    ProjectManager.on("projectOpen", function () {
        const projectPath = getProjectPath();
        if (projectPath) {
            manager.goto(projectPath);
        }
    });

    const prefs = Preferences.prefs;
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
