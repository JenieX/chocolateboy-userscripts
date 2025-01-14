// ==UserScript==
// @name          GitHub My Issues
// @description   Add a contextual link to issues you've contributed to on GitHub
// @author        chocolateboy
// @copyright     chocolateboy
// @version       1.3.1
// @namespace     https://github.com/chocolateboy/userscripts
// @license       GPL
// @include       https://github.com/
// @include       https://github.com/*
// @require       https://cdn.jsdelivr.net/npm/cash-dom@8.1.1/dist/cash.min.js
// @grant         GM_log
// ==/UserScript==

/*
 * value of the ID attribute for the "My Issues" link. used to identify an
 * existing link so it can be removed on pjax page loads
 */
const ID = 'my-issues'

/*
 * selector for the "Issues" link which we clone the "My Issues" link from and
 * append to
 */
const ISSUES = '[aria-label="Global"] a[href="/issues"]'

/*
 * text for the "My Issues" link
 */
const MY_ISSUES = 'My Issues'

/*
 * meta-tag selector for the `<user>/<repo>` identifier
 */
const REPO = 'octolytics-dimension-repository_nwo'

/*
 * meta-tag selector for the name of the logged-in user
 */
const SELF = 'user-login'

/*
 * meta-tag selector for the username on a profile page
 */
const USER = 'octolytics-dimension-user_login'

/*
 * helper function which extracts a value from a META tag
 */
function meta (name: string, key = 'name') {
    const quotedName = JSON.stringify(name)
    return $(`meta[${key}=${quotedName}]`).attr('content')
}

/*
 * add the "My Issues" link
 */
function run () {
    // if we're here via a pjax load, there may be an existing "My Issues" link
    // from a previous page load. we can't reuse it as the event handlers may no
    // longer work, so we just replace it
    $(`#${ID}`).remove()

    const self = meta(SELF)

    if (!self) {
        return
    }

    const $issues = $(ISSUES)

    if ($issues.length !== 1) {
        return
    }

    let subqueries = [`involves:${self}`, 'sort:updated-desc']
    let prop, path = '/issues'

    if (prop = meta(REPO)) { // user/repo
        path = `/${prop}/issues`
    } else if (prop = meta(USER)) { // user
        if (prop === self) { // own homepage
            // user:<self> is:open archived:false involves:<self> ...
            subqueries = [`user:${prop}`, 'is:open', 'archived:false', ...subqueries]
        } else { // other user's homepage
            // user:<user> involves:<self> ...
            subqueries = [`user:${prop}`, ...subqueries]
        }
    }

    const query = subqueries.join('+')
    const href = `${path}?q=${escape(query)}`
    const $link = $issues.clone()
        .attr({ href, 'data-hotkey': 'g I', id: ID })
        .text(MY_ISSUES)

    $issues.after($link)
}

// run on navigation (including full page loads)
$(document).on('turbo:load' as any, run)
