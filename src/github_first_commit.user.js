// ==UserScript==
// @name          GitHub First Commit
// @description   Add a link to a GitHub repo's first commit
// @author        chocolateboy
// @copyright     chocolateboy
// @version       2.6.0
// @namespace     https://github.com/chocolateboy/userscripts
// @license       GPL: https://www.gnu.org/copyleft/gpl.html
// @include       https://github.com/
// @include       https://github.com/*
// @require       https://code.jquery.com/jquery-3.5.1.slim.min.js
// @require       https://cdn.jsdelivr.net/gh/eclecto/jQuery-onMutate@79bbb2b8caccabfc9b9ade046fe63f15f593fef6/src/jquery.onmutate.min.js
// @grant         GM_log
// @inject-into   auto
// ==/UserScript==

// XXX note: the unused grant is a workaround for a Greasemonkey bug:
// https://github.com/greasemonkey/greasemonkey/issues/1614

const COMMIT_BAR = 'div.js-details-container[data-issue-and-pr-hovercards-enabled] > *:last ul'
const FIRST_COMMIT_LABEL = '<span aria-label="First commit"><strong>1st</strong> commit</span>'

// this function extracts the URL of the repo's first commit and navigates to it.
// it is based on code by several developers, a list of whom can be found here:
// https://github.com/FarhadG/init#contributors
//
// XXX it doesn't work on private repos. a way to do that can be found here,
// but it requires an authentication token:
// https://gist.github.com/simonewebdesign/a70f6c89ffd71e6ba4f7dcf7cc74ccf8
function openFirstCommit (user, repo) {
    return fetch(`https://api.github.com/repos/${user}/${repo}/commits`)
        // the `Link` header has additional URLs for paging.
        // parse the original JSON for the case where no other pages exist
        .then(res => Promise.all([res.headers.get('link'), res.json()]))

        .then(([link, commits]) => {
            if (link) {
                // the link header contains two URLs and has the following
                // format (wrapped for readability):
                //
                //     <https://api.github.com/repositories/1234/commits?page=2>;
                //     rel="next",
                //     <https://api.github.com/repositories/1234/commits?page=9>;
                //     rel="last"

                // extract the URL of the last page (commits are ordered in
                // reverse chronological order, like the CLI, so the oldest
                // commit is on the last page)
                const lastPage = link.match(/^.+?<([^>]+)>;/)[1]

                // fetch the last page of results
                return fetch(lastPage).then(res => res.json())
            }

            // if there's no link, we know we're on the only page
            return commits
        })

        // get the last commit and extract the target URL
        .then(commits => commits[commits.length - 1].html_url)

        // navigate there
        .then(url => location.href = url)
}

// add the "First commit" link as the last child of the commit bar
function addLink ($commitBar) {
    let $firstCommit = $commitBar.find('#first-commit')

    if ($firstCommit.length) {
        return
    }

    /*
     * This is the first LI in the commit bar (UL), which we clone to create the
     * "First commit" widget.
     *
     *   <li class="ml-3">
     *     <a data-pjax="" href="/foo/bar/commits/master" class="link-gray-dark no-underline">
     *       <svg height="16">...</svg>
     *
     *       <span class="d-none d-sm-inline">
     *           <strong>42</strong>
     *           <span aria-label="Commits on master">commits</span>
     *       </span>
     *     </a>
     *   </li>
     */

    // create it
    $firstCommit = $commitBar
        .find('li')
        .eq(0)
        .clone()
        .attr('id', 'first-commit')

    const $link = $firstCommit
        .find('a')
        .removeAttr('href')
        .css('cursor', 'pointer')

    const $label = $(FIRST_COMMIT_LABEL)

    $link.find('> span').empty().append($label)

    const [user, repo] = $('meta[name="octolytics-dimension-repository_network_root_nwo"]')
        .attr('content')
        .split('/')

    const oldLabelHtml = $label.html()

    // restore the original label so it has the correct value if we navigate
    // back to the repo page without making a new request (e.g. via the back
    // button)
    $(window).on('unload', () => {
        $label.html(oldLabelHtml)
    })

    $link.on('click', () => {
        $label.text('Loading...')
        openFirstCommit(user, repo)
        return false
    })

    $commitBar.append($firstCommit)
}

$.onCreate(COMMIT_BAR, addLink, true /* multi */)
