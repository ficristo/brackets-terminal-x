const PreferencesManager = brackets.getModule("preferences/PreferencesManager");
import Strings = require("./strings");
export const prefs = PreferencesManager.getExtensionPrefs("brackets-terminal-x");

// Default preference values.
prefs.definePreference(
    "shell.windows",
    "string",
    "C:\\Windows\\sysnative\\cmd.exe",
    {
        name: "Path to the shell used on Windows",
        description: Strings.DESCRIPTION_TERMINAL_SHELL_WINDOWS
    }
);
prefs.definePreference(
    "shellArgs.windows",
    "array",
    [],
    {
        name: "Arguments to pass to the shell when launched on Windows",
        description: Strings.DESCRIPTION_TERMINAL_SHELLARGS_WINDOWS
    }
);
prefs.definePreference(
    "shell.mac",
    "string",
    "/bin/bash",
    {
        name: "Path to the shell used on macOS",
        description: Strings.DESCRIPTION_TERMINAL_SHELL_MAC
    }
);
prefs.definePreference(
    "shellArgs.mac",
    "array",
    [],
    {
        name: "Arguments to pass to the shell when launched on macOS",
        description: Strings.DESCRIPTION_TERMINAL_SHELLARGS_MAC
    }
);
prefs.definePreference(
    "shell.linux",
    "string",
    "/bin/bash",
    {
        name: "Path to the shell used on Linux",
        description: Strings.DESCRIPTION_TERMINAL_SHELL_LINUX
    }
);
prefs.definePreference(
    "shellArgs.linux",
    "array",
    [],
    {
        name: "Arguments to pass to the shell when launched on Linux",
        description: Strings.DESCRIPTION_TERMINAL_SHELLARGS_LINUX
    }
);

prefs.definePreference(
    "collapsed",
    "boolean",
    false,
    {
        name: "Panel collapsed",
        description: Strings.DESCRIPTION_PANEL_COLLAPSED
    }
);

prefs.definePreference(
    "binaries",
    "object",
    {
        "javascript": "node",
        "text/x-sh": "sh"
    },
    {
        name: "Mapping of binary to use to run a script",
        description: Strings.DESCRIPTION_BINARY
    }
);


interface PlatformConfig {
    shellPath?: string;
    shellArgs?: string;
}

type ShellConfig = {
    [platform in typeof brackets.platform]: PlatformConfig;
};

const shell: ShellConfig = {
    win: {
        shellPath: "shell.windows",
        shellArgs: "shellArgs.windows"
    },
    mac: {
        shellPath: "shell.mac",
        shellArgs: "shellArgs.mac"
    },
    linux: {
        shellPath: "shell.linux",
        shellArgs: "shellArgs.linux"
    }
};

export function getShell() {
    const config = shell[brackets.platform];
    const params: PlatformConfig = {};
    for (const key in config) {
        if (config.hasOwnProperty(key)) {
            params[key] = prefs.get(config[key]);
        }
    }
    return params;
}
