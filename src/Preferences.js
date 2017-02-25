define(function (require, exports, module) {
    "use strict";

    var PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        // Strings            = brackets.getModule("strings"),
        prefs              = PreferencesManager.getExtensionPrefs("brackets-terminal-x");

    // Default preference values.
    prefs.definePreference(
        "port",
        "number",
        "8080",
        {
            name: "The port where listen terminal events",
            /*description: Strings.DESCRIPTION_TERMINAL_PORT*/
        }
    );
    prefs.definePreference(
        "shellPathWin",
        "string",
        "C:\\Windows\\system32\\cmd.exe",
        {
            name: "Path to the shell used on Windows",
            /*description: Strings.DESCRIPTION_TERMINAL_SHELL_PATH_WIN*/
        }
    );
    prefs.definePreference(
        "shellPathUnix",
        "string",
        "bash",
        {
            name: "Path to the shell used on Unix platforms",
            /*description: Strings.DESCRIPTION_TERMINAL_SHELL_PATH_UNIX*/
        }
    );
    prefs.definePreference(
        "shellPath",
        "string",
        "",
        {
            name: "If defined supercedes the other shellPathWin and shellPathUnix values",
            /*description: Strings.DESCRIPTION_TERMINAL_SHELL_PATH*/
        }
    );

    function getShellPath() {
        var shellPath = prefs.get("shellPath");
        if (brackets.platform === "win") {
            shellPath = shellPath || prefs.get("shellPathWin");
        } else {
            shellPath = shellPath || prefs.get("shellPathUnix");
        }
        return shellPath;
    }

    function getPort() {
        return prefs.get("port") || 8080;
    }

    exports.getShellPath = getShellPath;
    exports.getPort = getPort;
});
