// Imported, and then adapted, from:
// https://github.com/adobe/brackets/blob/baf964e123a5b0a8c34ef3dc58e657c2c75d7b7e/src/search/FindBar.js

/*
 * Copyright (c) 2014 - 2017 Adobe Systems Incorporated. All rights reserved.
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

/*
 * UI for the Find modal bar.
 */
define(function (require, exports, module) {
    "use strict";

    var _                  = brackets.getModule("thirdparty/lodash"),
        Mustache           = brackets.getModule("thirdparty/mustache/mustache"),
        EventDispatcher    = brackets.getModule("utils/EventDispatcher"),
        Commands           = brackets.getModule("command/Commands"),
        KeyBindingManager  = brackets.getModule("command/KeyBindingManager"),
        KeyEvent           = brackets.getModule("utils/KeyEvent"),
        ModalBar           = require("src/search/ModalBar").ModalBar,
        Strings            = brackets.getModule("strings"),
        ViewUtils          = brackets.getModule("utils/ViewUtils"),
        QuickSearchField   = brackets.getModule("search/QuickSearchField").QuickSearchField,
        prefs              = require("src/Preferences").prefs,
        stateManager       = require("src/Preferences").stateManager;

    /**
     * @private
     * The template we use for all Find bars.
     * @type {string}
     */
    var _searchBarTemplate = require("text!src/views/search-bar.html");

    var intervalId = 0,
        lastTypedText = "";

    /**
     * Find Bar UI component. This doesn't actually
     * create and add the FindBar to the DOM - for that, call open().
     *
     * Dispatches these events:
     *
     * - queryChange - when the user types in the input field or sets a query option. Use getQueryInfo()
     *      to get the current query state.
     * - doFind - when the user chooses to do a Find Previous or Find Next.
     *      Parameters are:
     *          shiftKey - boolean, false for Find Next, true for Find Previous
     *-  close - when the find bar is closed
     *
     * @constructor
     * @param {object}   options - parameters
     * @param {string=}  options.queryPlaceholder - label to show in the Find field - default empty string
     * @param {string=}  options.initialQuery - query to populate in the Find field on open - default empty string
     */
    function FindBar(options) {
        var defaults = {
            queryPlaceholder: "",
            initialQuery: ""
        };
        this._options = _.extend(defaults, options);
        this._closed = false;
        this._enabled = true;
        this.lastQueriedText = "";
        this.lastTypedText = "";
    }
    EventDispatcher.makeEventDispatcher(FindBar.prototype);

    /*
     * Global FindBar functions for making sure only one is open at a time.
     */

    // TODO: this is temporary - we should do this at the ModalBar level, but can't do that until
    // we land the simplified Quick Open UI (#7227) that eliminates some asynchronicity in closing
    // its ModalBar.

    /**
     * @private
     * Register a find bar so we can close it later if another one tries to open.
     * Note that this is a global function, not an instance function.
     * @param {!FindBar} findBar The find bar to register.
     */
    FindBar._addFindBar = function (findBar) {
        FindBar._bars = FindBar._bars || [];
        FindBar._bars.push(findBar);
    };

    /**
     * @private
     * Remove a find bar from the list.
     * Note that this is a global function, not an instance function.
     * @param {FindBar} findBar The bar to remove.
     */
    FindBar._removeFindBar = function (findBar) {
        if (FindBar._bars) {
            _.pull(FindBar._bars, findBar);
        }
    };

    /**
     * @private
     * Close all existing find bars. In theory there should be only one, but since there can be
     * timing issues due to animation we maintain a list.
     * Note that this is a global function, not an instance function.
     */
    FindBar._closeFindBars = function () {
        var bars = FindBar._bars;
        if (bars) {
            bars.forEach(function (bar) {
                bar.close(true, false);
            });
            bars = [];
        }
    };

    /*
     * Instance properties/functions
     */

    /**
     * @private
     * Options passed into the FindBar.
     * @type {!{queryPlaceholder: string, initialQuery: string}}
     */
    FindBar.prototype._options = null;

    /**
     * @private
     * Whether the FindBar has been closed.
     * @type {boolean}
     */
    FindBar.prototype._closed = false;

    /**
     * @private
     * Whether the FindBar is currently enabled.
     * @type {boolean}
     */
    FindBar.prototype._enabled = true;

    /**
     * @private
     * @type {?ModalBar} Modal bar containing this find bar's UI
     */
    FindBar.prototype._modalBar = null;

    /**
     * @private
     * Returns the jQuery object for an element in this Find bar.
     * @param {string} selector The selector for the element.
     * @return {jQueryObject} The jQuery object for the element, or an empty object if the Find bar isn't yet
     *      in the DOM or the element doesn't exist.
     */
    FindBar.prototype.$ = function (selector) {
        if (this._modalBar) {
            return $(selector, this._modalBar.getRoot());
        }
        return $();
    };

    // TODO: change IDs to classes

    /**
     * @private
     * Set the state of the toggles in the Find bar to the saved prefs state.
     */
    FindBar.prototype._updateSearchBarFromPrefs = function () {
        // Have to make sure we explicitly cast the second parameter to a boolean, because
        // toggleClass expects literal true/false.
        this.$("#find-case-sensitive").toggleClass("active", !!stateManager.get("caseSensitive"));
        this.$("#find-regexp").toggleClass("active", !!stateManager.get("regexp"));
    };

    /**
     * @private
     * Save the prefs state based on the state of the toggles.
     */
    FindBar.prototype._updatePrefsFromSearchBar = function () {
        stateManager.set("caseSensitive", this.$("#find-case-sensitive").is(".active"));
        stateManager.set("regexp",        this.$("#find-regexp").is(".active"));
    };

    /**
     * @private
     * Shows the keyboard shortcut for the given command in the element's tooltip.
     * @param {jQueryObject} $elem The element to add the shortcut to.
     * @param {string} commandId The ID for the command whose keyboard shortcut to show.
     */
    FindBar.prototype._addShortcutToTooltip = function ($elem, commandId) {
        var replaceShortcut = KeyBindingManager.getKeyBindings(commandId)[0];
        if (replaceShortcut) {
            var oldTitle = $elem.attr("title");
            oldTitle = (oldTitle ? oldTitle + " " : "");
            $elem.attr("title", oldTitle + "(" + KeyBindingManager.formatKeyDescriptor(replaceShortcut.displayKey) + ")");
        }
    };

    /**
     * @private
     * Adds element to the search history queue.
     * @param {string} searchVal string that needs to be added to history.
     */
    FindBar.prototype._addElementToSearchHistory = function (searchVal) {
        if (searchVal) {
            var searchHistory = stateManager.get("searchHistory");
            var maxCount = prefs.get("maxSearchHistory");
            var searchQueryIndex = searchHistory.indexOf(searchVal);
            if (searchQueryIndex !== -1) {
                searchHistory.splice(searchQueryIndex, 1);
            } else {
                if (searchHistory.length === maxCount) {
                    searchHistory.pop();
                }
            }
            searchHistory.unshift(searchVal);
            stateManager.set("searchHistory", searchHistory);
        }
    };

    /**
     * Opens the Find bar, closing any other existing Find bars.
     */
    FindBar.prototype.open = function () {
        var self = this;

        // Normally, creating a new Find bar will simply cause the old one to close
        // automatically. This can cause timing issues because the focus change might
        // cause the new one to think it should close, too. So we simply explicitly
        // close the old Find bar (with no animation) before creating a new one.
        // TODO: see note above - this will move to ModalBar eventually.
        FindBar._closeFindBars();

        var templateVars = _.clone(this._options);
        templateVars.Strings = Strings;

        self._addElementToSearchHistory(this._options.initialQuery);

        this._modalBar = new ModalBar(Mustache.render(_searchBarTemplate, templateVars), false);  // 2nd arg = auto-close on Esc/blur

        // When the ModalBar closes, clean ourselves up.
        this._modalBar.on("close", function (event) {
            // Hide error popup, since it hangs down low enough to make the slide-out look awkward
            self.showError(null);
            self._modalBar = null;
            self._closed = true;
            window.clearInterval(intervalId);
            intervalId = 0;
            FindBar._removeFindBar(self);
            self.trigger("close");
            if (self.searchField) {
                self.searchField.destroy();
            }
        });

        FindBar._addFindBar(this);

        var $root = this._modalBar.getRoot();
        $root
            .on("input", "#find-what", function () {
                self.trigger("queryChange");
                lastTypedText = self.getQueryInfo().query;
            })
            .on("click", "#find-case-sensitive, #find-regexp", function (e) {
                $(e.currentTarget).toggleClass("active");
                self._updatePrefsFromSearchBar();
                self.trigger("queryChange");
            })
            .on("click", ".dropdown-icon", function (e) {
                var quickSearchContainer = $(".quick-search-container");
                if (!self.searchField) {
                    self.showSearchHints();
                } else if (quickSearchContainer.is(":visible")) {
                    quickSearchContainer.hide();
                } else {
                    self.searchField.setText(self.$("#find-what").val());
                    quickSearchContainer.show();
                }
                self.$("#find-what").focus();
            })
            .on("keydown", "#find-what", function (e) {
                if (e.keyCode === KeyEvent.DOM_VK_RETURN) {
                    e.preventDefault();
                    e.stopPropagation();
                    self._addElementToSearchHistory(self.$("#find-what").val());

                    // In the single file case, we just want to trigger a Find Next (or Find Previous
                    // if Shift is held down).
                    self.trigger("doFind", e.shiftKey);
                } else if (e.keyCode === KeyEvent.DOM_VK_DOWN || e.keyCode === KeyEvent.DOM_VK_UP) {
                    var quickSearchContainer = $(".quick-search-container");
                    if (!self.searchField) {
                        self.showSearchHints();
                    } else if (!quickSearchContainer.is(":visible")) {
                        quickSearchContainer.show();
                    }
                }
            });

        this._addShortcutToTooltip($("#find-next"), Commands.CMD_FIND_NEXT);
        this._addShortcutToTooltip($("#find-prev"), Commands.CMD_FIND_PREVIOUS);
        $root
            .on("click", "#find-next", function (e) {
                self.trigger("doFind", false);
            })
            .on("click", "#find-prev", function (e) {
                self.trigger("doFind", true);
            });

        // Set up the initial UI state.
        this._updateSearchBarFromPrefs();
        this.focusQuery();
    };

    /**
     * @private
     * Shows the search History in dropdown.
     */
    FindBar.prototype.showSearchHints = function () {
        var self = this;
        var searchFieldInput = self.$("#find-what");
        this.searchField = new QuickSearchField(searchFieldInput, {
            verticalAdjust: searchFieldInput.offset().top > 0 ? 0 : this._modalBar.getRoot().outerHeight(),
            maxResults: 20,
            firstHighlightIndex: null,
            resultProvider: function (query) {
                var asyncResult = new $.Deferred();
                asyncResult.resolve(stateManager.get("searchHistory"));
                return asyncResult.promise();
            },
            formatter: function (item, query) {
                return "<li>" + item + "</li>";
            },
            onCommit: function (selectedItem, query) {
                if (selectedItem) {
                    self.$("#find-what").val(selectedItem);
                    self.trigger("queryChange");
                } else if (query.length) {
                    self.searchField.setText(query);
                }
                self.$("#find-what").focus();
                $(".quick-search-container").hide();
            },
            onHighlight: function (selectedItem, query, explicit) {},
            highlightZeroResults: false
        });
        this.searchField.setText(searchFieldInput.val());
    };

    /**
     * Closes this Find bar. If already closed, does nothing.
     * @param {boolean} suppressAnimation If true, don't do the standard closing animation. Default false.
     */
    FindBar.prototype.close = function (suppressAnimation) {
        if (this._modalBar) {
            // 1st arg = restore scroll pos; 2nd arg = no animation, since getting replaced immediately
            this._modalBar.close(true, !suppressAnimation);
        }
    };

    /**
     * @return {boolean} true if this FindBar has been closed.
     */
    FindBar.prototype.isClosed = function () {
        return this._closed;
    };

    /**
     * @return {Object} The options passed into the FindBar.
     */
    FindBar.prototype.getOptions = function () {
        return this._options;
    };

    /**
     * Returns the current query and parameters.
     * @return {{query: string, caseSensitive: boolean, isRegexp: boolean}}
     */
    FindBar.prototype.getQueryInfo = function () {
        return {
            query: this.$("#find-what").val() || "",
            isCaseSensitive: this.$("#find-case-sensitive").is(".active"),
            isRegexp: this.$("#find-regexp").is(".active")
        };
    };

    /**
     * Show or clear an error message related to the query.
     * @param {?string} error The error message to show, or null to hide the error display.
     * @param {boolean=} isHTML Whether the error message is HTML that should remain unescaped.
     */
    FindBar.prototype.showError = function (error, isHTML) {
        var $error = this.$(".error");
        if (error) {
            if (isHTML) {
                $error.html(error);
            } else {
                $error.text(error);
            }
            $error.show();
        } else {
            $error.hide();
        }
    };

    /**
     * Set the find count.
     * @param {string} count The find count message to show. Can be the empty string to hide it.
     */
    FindBar.prototype.showFindCount = function (count) {
        this.$("#find-counter").text(count);
    };

    /**
     * Show or hide the no-results indicator and optional message. This is also used to
     * indicate regular expression errors.
     * @param {boolean} showIndicator
     * @param {boolean} showMessage
     */
    FindBar.prototype.showNoResults = function (showIndicator, showMessage) {
        ViewUtils.toggleClass(this.$("#find-what"), "no-results", showIndicator);

        var $msg = this.$(".no-results-message");
        if (showMessage) {
            $msg.show();
        } else {
            $msg.hide();
        }
    };

    /**
     * Enables or disables the controls in the Find bar. Note that if enable is true, *all* controls will be
     * re-enabled, even if some were previously disabled using enableNavigation(), so you
     * will need to refresh their enable state after calling this.
     * @param {boolean} enable Whether to enable or disable the controls.
     */
    FindBar.prototype.enable = function (enable) {
        this.$("#find-what, #find-prev, #find-next, #find-case-sensitive, #find-regexp").prop("disabled", !enable);
        this._enabled = enable;
    };

    FindBar.prototype.focus = function (enable) {
        this.$("#find-what").focus();
    };

    /**
     * @return {boolean} true if the FindBar is enabled.
     */
    FindBar.prototype.isEnabled = function () {
        return this._enabled;
    };

    /**
     * Enable or disable the navigation controls if present. Note that if the Find bar is currently disabled
     * (i.e. isEnabled() returns false), this will have no effect.
     * @param {boolean} enable Whether to enable the controls.
     */
    FindBar.prototype.enableNavigation = function (enable) {
        if (this.isEnabled()) {
            this.$("#find-prev, #find-next").prop("disabled", !enable);
        }
    };

    /**
     * @private
     * Focus and select the contents of the given field.
     * @param {string} selector The selector for the field.
     */
    FindBar.prototype._focus = function (selector) {
        this.$(selector)
            .focus()
            .get(0).select();
    };

    /**
     * Sets focus to the query field and selects its text.
     */
    FindBar.prototype.focusQuery = function () {
        this._focus("#find-what");
    };

    /**
     * The indexing spinner is usually shown when node is indexing files
     */
    FindBar.prototype.showIndexingSpinner = function () {
        this.$("#indexing-spinner").removeClass("forced-hidden");
    };

    FindBar.prototype.hideIndexingSpinner = function () {
        this.$("#indexing-spinner").addClass("forced-hidden");
    };

    /**
     * Force a search again
     */
    FindBar.prototype.redoInstantSearch = function () {
        this.trigger("doFind");
    };

    /**
     * Gets you the right query text to prepopulate the Find Bar.
     * @static
     * @param {?FindBar} currentFindBar The currently open Find Bar, if any
     * @param {?Editor} The active editor, if any
     * @return {query: string} Query text to prepopulate the Find Bar with
     */
    FindBar.getInitialQuery = function (currentFindBar, editor) {
        var query = lastTypedText;

        /*
         * Returns the string used to prepopulate the find bar
         * @param {!Editor} aEditor
         * @return {string} first line of primary selection to populate the find bar
         */
        function getInitialQueryFromSelection(aEditor) {
            var selectionText = aEditor.getSelectedText();
            if (selectionText) {
                return selectionText
                    .replace(/^\n*/, "") // Trim possible newlines at the very beginning of the selection
                    .split("\n")[0];
            }
            return "";
        }

        if (currentFindBar && !currentFindBar.isClosed()) {
            // The modalBar was already up. When creating the new modalBar, copy the
            // current query instead of using the passed-in selected text.
            query = currentFindBar.getQueryInfo().query;
        } else {
            var openedFindBar = FindBar._bars && _.find(FindBar._bars, function (bar) {
                return !bar.isClosed();
            });

            if (openedFindBar) {
                query = openedFindBar.getQueryInfo().query;
            } else if (editor) {
                query = getInitialQueryFromSelection(editor) || lastTypedText;
            }
        }

        return {query: query};
    };

    stateManager.definePreference("caseSensitive", "boolean", false);
    stateManager.definePreference("regexp", "boolean", false);
    stateManager.definePreference("searchHistory", "array", []);
    prefs.definePreference("maxSearchHistory", "number", 10, {
        description: Strings.FIND_HISTORY_MAX_COUNT
    });

    exports.FindBar = FindBar;
});
