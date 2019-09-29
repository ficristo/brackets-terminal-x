# Brackets Terminal X

Brackets extension to integrate the terminal of your choice.

![Terminals](screenshots/terminals.png)


## Requirements

Since v1.0.0 you shouldn't need anything.
In earlier versions you needed a C++ compiler installed to your computer.


## How to install

Since Brackets 1.11 it is possible to install directly from the Extension Manager on all platforms.
It could take a while to be installed, be patient.

### Installing manually

Download a zip of the extension from GitHub through its "Clone or Download" feature.
After that:
- go to your extension folder [1]
- here extract the zip downloaded before
- `cd brackets-terminal-x-master`
- only if you are on Windows, create a new file named `.npmrc` [2]
- run `npm install` [3]
- close and reopen Brackets.



[1] Use `Help \ Show Extensions Folder` or [manually](https://github.com/adobe/brackets/wiki/Extension-Locations#user-extensions-folder)<br />
[2] This file is necessary for Windows build until Windows 64 is properly supported.<br />
Its content should be:
```properties
arch=ia32
npm_config_arch=ia32
npm_config_target_arch=ia32
```
[3] Make sure to use the same major version of Node.js used for Brackets. Brackets 1.14 uses Node.js 6.<br />


## Report an issue

This extension is based on [xterm](https://github.com/xtermjs/xterm.js).
Before to report an issue you should verify that you cannot reproduce it with the [xterm demo](https://xtermjs.org/#demo).


## Preferences

```js
{
    // Other examples:
    // - C:\\Windows\\sysnative\\WindowsPowerShell\\v1.0\\powershell.exe
    // - C:\\Program Files\\Git\\bin\\bash.exe
    "brackets-terminal-x.shell.windows": "C:\\Windows\\sysnative\\cmd.exe",
    "brackets-terminal-x.shellArgs.windows": [],
    "brackets-terminal-x.shell.mac": "/bin/bash",
    "brackets-terminal-x.shellArgs.mac": [],
    "brackets-terminal-x.shell.linux": "/bin/bash",
    "brackets-terminal-x.shellArgs.linux": [],
    // "dom" or "canvas"
    "brackets-terminal-x.rendererType": "dom",
    // binary to use to run a script for the current file mode
    "brackets-terminal-x.binaries": {
        "javascript": "node",
        "text/x-sh": "sh"
    }
}
```

**NOTE:** Brackets preferences do NOT support comments in them.


## User Key Bindings

No key binding is set by default.

```js
{
    // Show \ Hide the terminal panel.
    "": "brackets-terminal-x.show",
    // Run focused editor in the terminal.
    "": "brackets-terminal-x.run-script"
}
```

**NOTE:** Brackets User Key Bindings do NOT support comments in them.


## Known issues

The height of the scrollbar of the terminal is less than the panel.

If you remove the extension from the Extension Manager more likely it will fail.
At least on Windows there is an executable running so you will need to clean the remaining files by yourself.

When upgrading most likely you will have the same problems.
If so try to remove the extension manually before upgrading.


## Thanks

This extension is inspired by https://github.com/artoale/brackets-terminal but built with [xterm](http://xtermjs.org) and [node-pty](https://github.com/Microsoft/node-pty) (actually the prebuilt version [node-pty-prebuilt](https://github.com/daviwil/node-pty-prebuilt))
