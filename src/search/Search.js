// Imported, and then adapted, from:
// https://github.com/adobe/brackets/blob/baf964e123a5b0a8c34ef3dc58e657c2c75d7b7e/src/search/FindReplace.js

/*eslint-disable max-len*/

/*
 * Copyright (c) 2012 - 2017 Adobe Systems Incorporated. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/**
 * Adds Find commands
 *
 * Originally based on the code in CodeMirror/lib/util/search.js.
 */
define(function (require, exports, module) {
    "use strict";

    var FindBar             = require("src/search/FindBar").FindBar,
        FindUtils           = brackets.getModule("search/FindUtils"),
        manager             = require("src/TerminalManager");

    /**
     * Currently open Find, if any
     * @type {?FindBar}
     */
    var findBar;

    function SearchState() {
        this.searchStartPos = null;
        this.parsedQuery = null;
        this.queryInfo = null;
        this.foundAny = false;
        this.marked = [];
        this.resultSet = [];
        this.matchIndex = -1;
        this.markedCurrent = null;
    }

    var state = new SearchState();

    function parseQuery(queryInfo) {
        if (findBar) {
            findBar.showError(null);
        }

        var parsed = FindUtils.parseQueryInfo(queryInfo);
        if (parsed.empty === true) {
            return "";
        }

        if (!parsed.valid) {
            if (findBar) {
                findBar.showError(parsed.error);
            }
            return "";
        }

        return parsed.queryExpr;
    }

    /**
     * @private
     * Determine the query from the given info and store it in the state.
     * @param {SearchState} state The state to store the parsed query in
     * @param {{query: string, caseSensitive: boolean, isRegexp: boolean}} queryInfo
     *      The query info object as returned by FindBar.getQueryInfo()
     */
    function setQueryInfo(queryInfo) {
        state.queryInfo = queryInfo;
        if (!queryInfo) {
            state.parsedQuery = null;
        } else {
            state.parsedQuery = parseQuery(queryInfo);
        }
    }


    /**
     * @param {?boolean} searchBackwards
     */
    function findNext(searchBackwards) {
        manager.search(state.parsedQuery, searchBackwards);
    }

    /**
     * Called each time the search query field changes. Updates state.parsedQuery (parsedQuery will be falsy if the field
     * was blank OR contained a regexp with invalid syntax). Then calls updateResultSet(), and then jumps to
     * the first matching result, starting from the original cursor position.
     * @param {boolean} initial Whether this is the initial population of the query when the search bar opens.
     *     In that case, we don't want to change the selection unnecessarily.
     */
    function handleQueryChange(initial) {
        setQueryInfo(state, findBar.getQueryInfo());

        if (state.parsedQuery) {
            findNext(false);
        }
    }

    function parseQuery(queryInfo) {
        if (findBar) {
            findBar.showError(null);
        }

        var parsed = FindUtils.parseQueryInfo(queryInfo);
        if (parsed.empty === true) {
            return "";
        }

        if (!parsed.valid) {
            if (findBar) {
                findBar.showError(parsed.error);
            }
            return "";
        }

        return parsed.queryExpr;
    }

    /**
     * Creates a Find bar for the current search session.
     * @param {!Editor} editor
     */
    function openSearchBar(editor) {
        // Prepopulate the search field
        var initialQuery = FindBar.getInitialQuery(findBar, editor);

        // Close our previous find bar, if any. (The open() of the new findBar will
        // take care of closing any other find bar instances.)
        if (findBar) {
            findBar.close();
        }

        // Create the search bar UI (closing any previous find bar in the process)
        findBar = new FindBar({
            initialQuery: initialQuery.query
        });
        findBar.open();

        findBar
            .on("queryChange.FindReplace", function (e) {
                handleQueryChange();
            })
            .on("doFind.FindReplace", function (e, searchBackwards) {
                findNext(searchBackwards);
            })
            .on("close.FindReplace", function (e) {
                findBar.off(".FindReplace");
                findBar = null;
            });

        handleQueryChange();
    }

    exports.openSearchBar = openSearchBar;
});
