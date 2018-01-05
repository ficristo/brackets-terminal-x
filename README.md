# Brackets Terminal X

Brackets extension to integrate the terminal of your choice.

![Terminals](screenshots/terminals.png)


## Requirements

You need a C++ compiler installed to your computer.


## How to install

Since Brackets 1.11 it is possible to install directly from the Extension Manager on all platforms.
It can take a while to be installed, be patient.

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
[3] Make sure to use the same major version of Node.js used for Brackets. Brackets 1.11 uses Node.js 6.<br />


### Brackets Electron

To install manually is similar as above, but, regardless the platform, create always the '.npmrc' file.
Its content should be the following:
```properties
disturl=https://atom.io/download/electron
runtime=electron
target=1.6.6    # The same version of electron used in Brackets Electron
arch=x64        # x64 if you're on 64 bit platform, ia32 if you're on 32 bit platform
```


## Report an issue

This extension is based on [xterm](https://github.com/sourcelair/xterm.js).
Before to report an issue you should verify that you cannot reproduce it with the xterm demo.
To run it you should clone their repository and follow their [instructions](https://github.com/sourcelair/xterm.js#demo)


## Preferences

```cson
{
    // Other examples:
    // - C:\\Windows\\sysnative\\WindowsPowerShell\\v1.0\\powershell.exe
    // - C:\\Program Files\\Git\\bin\\bash.exe
    "brackets-terminal-x.shell.windows": "C:\\Windows\\sysnative\\cmd.exe",
    "brackets-terminal-x.shellArgs.windows": [],
    "brackets-terminal-x.shell.mac": "/bin/bash",
    "brackets-terminal-x.shellArgs.mac": [],
    "brackets-terminal-x.shell.linux": "/bin/bash",
    "brackets-terminal-x.shellArgs.linux": []
}
```

**NOTE:** Brackets preferences do NOT support comments in them.


## User Key Bindings

No key binding is set by default.

```cson
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


## Thanks

This extension is inspired by https://github.com/artoale/brackets-terminal but built with [xterm](http://xtermjs.org) and [node-pty](https://github.com/Tyriar/node-pty)
