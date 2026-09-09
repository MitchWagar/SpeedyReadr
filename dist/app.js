'use strict';

const $ = id => document.getElementById(id);

const sample = 'A quiet room. A good story. A little time to yourself.\n\nHold your mouse or finger on the reading area, and let the words come to you. Release whenever you need a moment. There is no finish line here, just the next word. Read at your own pace.';

let words = [];
let index = 0;
let timer = null;
let playing = false;
let finished = false;
let keyboard = false;
let uploadVersion = 0;
let title = "Sample text";
let paragraphVersion = 1;

const pointers = new Set();

/*

============================================================
LOCAL BOOKMARK STORAGE
============================================================
Bookmarks are saved in this browser/device.
Nothing is sent to a server.
Nothing uses /api/bookmarks.
NOTE:
localStorage is specific to the browser/device.
A bookmark saved on a PC will not automatically appear
on a phone.
*/
const BOOKMARKS_KEY = 'speedy-readr-bookmarks';

$('text').value = sample;

/*

============================================================
READING FUNCTIONS
============================================================
*/
function delay(word, speed = Number($('speed').value)) {
const text = typeof word === 'string' ? word : word.text;

const clean = text.replace(
    /["\u201d\u2019'\])}]+$/u,
    ''
);

const beat = 60000 / speed;

const multiplier =
    /[.!?…]$/u.test(clean)
        ? 4
        : /[,;:]$/u.test(clean)
            ? 2.5
            : 1;

const hyphenated =
    /[-\u00ad\u2010\u2011\u2014\ufe63\uff0d]/u.test(text) &&
    /[\p{L}\p{N}]/u.test(text);

const length =
    (text.match(/[\p{L}\p{N}]/gu) || []).length;

const extra =
    hyphenated
        ? 1 + length / 4
        : 0;

return beat * (
    multiplier +
    extra +
    (word.paragraphEnd ? 3 : 0)
);

}

function plainText(tokens) {
return tokens.map((w, i) =>
w.text +
(
i < tokens.length - 1
? (w.paragraphEnd ? '\n\n' : ' ')
: ''
)
).join('');
}

function fit() {
const el = $('word');

el.style.fontSize = '';

const size =
    parseFloat(getComputedStyle(el).fontSize);

if (el.scrollWidth > $('pad').clientWidth - 44) {
    el.style.fontSize =
        Math.max(
            8,
            size *
            ($('pad').clientWidth - 44) /
            el.scrollWidth
        ) + 'px';
}

}

function render() {
$('word').replaceChildren();

for (
    const part of (
        words[index]?.parts ||
        [{ text: 'Ready.', italic: false }]
    )
) {
    const span = document.createElement(
        part.italic ? 'em' : 'span'
    );

    span.textContent = part.text;

    $('word').append(span);
}

$('position').textContent =
    words.length
        ? `${index + 1} / ${words.length.toLocaleString()} words`
        : '0 words';

const pct =
    finished
        ? 100
        : words.length > 1
            ? Math.round(
                index /
                (words.length - 1) *
                1000
            ) / 10
            : 0;

$('percent').textContent = pct + '%';

$('progress').value = pct;

$('progress').setAttribute(
    'aria-valuetext',
    `${pct}% · word ${
        words.length ? index + 1 : 0
    } of ${words.length}`
);

$('status').textContent =
    finished
        ? 'Finished'
        : playing
            ? 'Reading'
            : index === 0
                ? 'Ready to read'
                : 'Paused';

$('pad').classList.toggle(
    'active',
    playing
);

$('holdHint').textContent =
    finished
        ? 'Finished · rewind or jump to 0% to read again'
        : playing
            ? 'Release to pause & rewind 10'
            : 'Press and hold here to read';

fit();

}

function pause() {
clearTimeout(timer);

timer = null;
playing = false;

render();

}

function schedule() {
clearTimeout(timer);

timer = setTimeout(() => {
    if (!playing) return;

    if (index >= words.length - 1) {
        finished = true;
        pause();
        return;
    }

    index++;

    render();
    schedule();

}, delay(words[index]));

}

function start() {
if (
playing ||
!words.length ||
finished
) return;

playing = true;

render();
schedule();

}

function seek(amount) {
pause();

index = Math.max(
    0,
    Math.min(
        words.length - 1,
        index + amount
    )
);

finished = false;

render();

}

function load(input, label) {
const next =
typeof input === 'string'
? tokenize([{ text: input }])
: input;

if (!next.length) {
    $('message').textContent =
        'Add some text before loading the reader.';

    return false;
}

resetInput();

words = next;
index = 0;
finished = false;
title = label;
paragraphVersion = 1;

$('sourceCount').textContent = label;

$('message').textContent =
    `${words.length.toLocaleString()} words loaded. ` +
    `Hold the reading area to begin.`;

render();

return true;

}

/*

============================================================
TEXT INPUT
============================================================
*/
let importedText = '';
let importedWords = null;

$('clearText').onclick = () => {
uploadVersion++;

$('text').value = '';

importedText = '';
importedWords = null;

$('file').value = '';

$('message').textContent =
    'Paste area cleared. Add new text when ready.';

$('text').focus({
    preventScroll: true
});

};

$('load').onclick = () => {
uploadVersion++;

const text = $('text').value;

load(
    importedWords &&
    text === importedText
        ? importedWords
        : text,

    importedWords &&
    text === importedText
        ? title
        : 'Pasted text'
);

};

/*

============================================================
POSITION / SCRUBBER
============================================================
*/
function jumpToPercent(value) {
const pct = Number(value);

if (
    !Number.isFinite(pct) ||
    !words.length
) return;

resetInput();

index = Math.round(
    (words.length - 1) *
    Math.max(
        0,
        Math.min(100, pct)
    ) /
    100
);

finished = false;

render();

}

$('progress').addEventListener(
'pointerdown',
resetInput
);

$('progress').addEventListener(
'input',
e => jumpToPercent(e.target.value)
);

$('jumpForm').addEventListener(
'submit',
e => {
e.preventDefault();

    if (
        $('jumpPercent').value.trim() === '' ||
        !$('jumpPercent').checkValidity()
    ) return;

    jumpToPercent(
        $('jumpPercent').value
    );
}

);

/*

============================================================
READING SPEED
============================================================
*/
$('speed').oninput = () => {
$('speedValue').innerHTML =
$('speed').value +
' <small>WPM</small>';

if (playing) schedule();

};

/*

============================================================
READING PAD / TOUCH / MOUSE
============================================================
*/
const pad = $('pad');

pad.addEventListener(
'pointerdown',
e => {
if (
e.pointerType === 'mouse' &&
e.button !== 0
) return;

    e.preventDefault();

    pad.focus({
        preventScroll: true
    });

    pointers.add(e.pointerId);

    pad.setPointerCapture(
        e.pointerId
    );

    if (pointers.size === 1) {
        start();
    }
}

);

function release(e) {
if (!pointers.delete(e.pointerId)) {
return;
}

if (!pointers.size) {
    seek(-10);
}

}

function cancelPointer(e) {
if (!pointers.delete(e.pointerId)) {
return;
}

if (!pointers.size) {
    pause();
}

}

window.addEventListener(
'pointerup',
release
);

window.addEventListener(
'pointercancel',
cancelPointer
);

pad.addEventListener(
'lostpointercapture',
cancelPointer
);

pad.addEventListener(
'contextmenu',
e => e.preventDefault()
);

/*

============================================================
MOUSE WHEEL
============================================================
*/
let wheelAt = -Infinity;

pad.addEventListener(
'wheel',
e => {
e.preventDefault();

    if (!e.deltaY) return;

    const now = performance.now();

    if (
        now - wheelAt < 140
    ) return;

    wheelAt = now;

    seek(
        e.deltaY > 0
            ? 5
            : -5
    );
},
{
    passive: false
}

);

/*

============================================================
KEYBOARD
============================================================
*/
pad.addEventListener(
'keydown',
e => {
if (e.code === 'Space') {
e.preventDefault();

        if (!e.repeat) {
            keyboard = true;
            start();
        }
    }

    if (
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight'
    ) {
        e.preventDefault();

        seek(
            e.code === 'ArrowLeft'
                ? -5
                : 5
        );
    }
}

);

window.addEventListener(
'keyup',
e => {
if (
e.code === 'Space' &&
keyboard
) {
keyboard = false;
seek(-10);
}
}
);

/*

============================================================
RESET / PAGE VISIBILITY
============================================================
*/
function resetInput() {
pointers.clear();
keyboard = false;
pause();
}

window.addEventListener(
'blur',
resetInput
);

document.addEventListener(
'visibilitychange',
() => {
if (document.hidden) {
resetInput();
}
}
);

pad.addEventListener(
'blur',
resetInput
);

window.addEventListener(
'resize',
fit
);

/*

============================================================
DOCUMENT IMPORT
============================================================
*/
$('file').onchange = async e => {
const file = e.target.files[0];

if (!file) return;

resetInput();

const version = ++uploadVersion;

$('message').textContent =
    'Opening document…';

try {
    if (
        file.size >
        50 * 1024 * 1024
    ) {
        throw Error(
            'Choose a file smaller than 50 MB, or upload one chapter at a time.'
        );
    }

    const ext =
        file.name
            .split('.')
            .pop()
            .toLowerCase();

    if (
        ![
            'docx',
            'epub',
            'txt',
            'pdf'
        ].includes(ext)
    ) {
        throw Error(
            'Please use .docx, .epub, .pdf, or .txt. Save older .doc files as .docx first.'
        );
    }

    const next =
        ext === 'txt'
            ? tokenize([
                {
                    text: await file.text()
                }
            ])

            : ext === 'pdf'
                ? await readPdf(
                    await file.arrayBuffer()
                )

                : ext === 'epub'
                    ? await readEpub(
                        await file.arrayBuffer()
                    )

                    : await readDocx(
                        await file.arrayBuffer()
                    );

    if (
        version !== uploadVersion
    ) return;

    if (
        load(next, file.name)
    ) {
        importedWords = next;

        importedText =
            plainText(next);

        $('text').value =
            importedText;

        $('message').textContent =
            `${file.name} · ` +
            `${words.length.toLocaleString()} ` +
            `words loaded automatically. ` +
            `Hold the reading box to begin. ` +
            `${
                next.importNotice ||
                'Original italics retained in the reader.'
            }`;

        $('status').textContent =
            'Document ready to read';

        pad.scrollIntoView({
            behavior: 'auto',
            block: 'center'
        });

        pad.focus({
            preventScroll: true
        });
    }

} catch (error) {

    if (
        version === uploadVersion
    ) {
        $('message').textContent =
            error instanceof RangeError
                ? 'This file appears damaged or too large. Try a fresh copy.'
                : error.message;
    }

} finally {
    e.target.value = '';
}

};

/*

============================================================
LOCAL BOOKMARK FUNCTIONS
============================================================
*/
/*

Get all bookmarks from this browser.
*/
function getBookmarks() {
try {
const stored =
localStorage.getItem(
BOOKMARKS_KEY
);

    if (!stored) {
        return [];
    }

    const bookmarks =
        JSON.parse(stored);

    return Array.isArray(bookmarks)
        ? bookmarks
        : [];

} catch (error) {

    console.error(
        'Could not read local bookmarks:',
        error
    );

    return [];
}

}

/*

Save all bookmarks to this browser.
*/
function saveBookmarks(bookmarks) {
try {

    localStorage.setItem(
        BOOKMARKS_KEY,
        JSON.stringify(bookmarks)
    );

    return true;

} catch (error) {

    console.error(
        'Could not save local bookmarks:',
        error
    );

    return false;
}

}

/*

Create a unique ID for the current book.
The same book gets the same ID, so saving the same
book again updates its bookmark instead of creating
another copy.
*/
async function getBookId(bookWords) {

const data =
    JSON.stringify(
        bookWords.map(
            ({
                text,
                parts,
                paragraphEnd
            }) => ({
                text,
                parts,
                paragraphEnd
            })
        )
    );


/*
 * Use SHA-256 when available.
 */

if (window.crypto?.subtle) {

    const digest =
        await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(data)
        );

    return Array.from(
        new Uint8Array(digest),
        b =>
            b.toString(16)
                .padStart(2, '0')
    ).join('');
}


/*
 * Fallback for older browsers.
 */

let hash = 0;

for (
    let i = 0;
    i < data.length;
    i++
) {
    hash =
        ((hash << 5) -
            hash) +
        data.charCodeAt(i);

    hash |= 0;
}

return (
    'local-' +
    Math.abs(hash)
);

}

/*

============================================================
DISPLAY SAVED BOOKMARKS
============================================================
*/
async function refreshBookmarks() {

const select =
    $('bookmarks');

const restoreButton =
    $('restoreBookmark');

const list =
    getBookmarks();

/*
 * Clear the current dropdown.
 */

select.replaceChildren();

/*
 * Add placeholder.
 */

const placeholder =
    document.createElement(
        'option'
    );

placeholder.value = '';

placeholder.textContent =
    list.length
        ? 'Choose a saved bookmark'
        : 'No bookmarks yet';

select.append(
    placeholder
);

/*
 * Add saved bookmarks.
 */

for (
    const item of list
) {

    const option =
        document.createElement(
            'option'
        );

    option.value =
        item.id;

    option.textContent =
        `${item.title} · word ${
            Number(item.index) + 1
        }`;

    select.append(
        option
    );
}

/*
 * Enable Resume when bookmarks exist.
 */

restoreButton.disabled =
    !list.length;

if (!list.length) {

    $('bookmarkMessage').textContent =
        'Bookmarks are stored privately in this browser on this device.';
}

}

/*

============================================================
SAVE BOOKMARK
============================================================
*/
$('saveBookmark').onclick =
async () => {

    resetInput();

    /*
     * Don't allow empty bookmarks.
     */

    if (!words.length) {

        $('bookmarkMessage').textContent =
            'Load some text before saving a bookmark.';

        return;
    }

    /*
     * Capture everything needed to restore
     * the book and its position.
     */

    const snapshot = {

        title,

        words,

        index,

        paragraphVersion,

        speed:
            Number(
                $('speed').value
            ),

        savedAt:
            new Date().toISOString()
    };

    const button =
        $('saveBookmark');

    button.disabled = true;

    $('bookmarkMessage').textContent =
        'Saving your book and position privately on this device…';

    try {

        /*
         * Generate a stable ID based on the book.
         */

        const id =
            await getBookId(words);

        /*
         * Get existing bookmarks.
         */

        const bookmarks =
            getBookmarks();

        /*
         * Create the bookmark object.
         */

        const bookmark = {
            ...snapshot,
            id
        };

        /*
         * Check whether this book already has
         * a bookmark.
         */

        const existingIndex =
            bookmarks.findIndex(
                item =>
                    item.id === id
            );

        if (
            existingIndex >= 0
        ) {

            /*
             * Update existing bookmark.
             */

            bookmarks[
                existingIndex
            ] = bookmark;

        } else {

            /*
             * Add new bookmark at the top.
             */

            bookmarks.unshift(
                bookmark
            );
        }

        /*
         * Keep the 50 most recent bookmarks.
         */

        const trimmed =
            bookmarks.slice(0, 50);

        /*
         * Actually write to localStorage.
         */

        if (
            !saveBookmarks(trimmed)
        ) {

            throw Error(
                'Your browser could not save the bookmark. Check that local storage is enabled.'
            );
        }

        /*
         * Tell the user it worked.
         */

        $('bookmarkMessage').textContent =
            `Saved “${snapshot.title}” at word ${
                snapshot.index + 1
            }. This bookmark is stored only in this browser.`;

        /*
         * Refresh dropdown.
         */

        await refreshBookmarks();

        /*
         * Select the bookmark we just saved.
         */

        $('bookmarks').value =
            id;

    } catch (error) {

        $('bookmarkMessage').textContent =
            error.message ||
            'Could not save bookmark.';

    } finally {

        button.disabled = false;
    }
};

/*

============================================================
RESTORE BOOKMARK
============================================================
*/
$('restoreBookmark').onclick =
async () => {

    const id =
        $('bookmarks').value;

    if (!id) {

        $('bookmarkMessage').textContent =
            'Choose a bookmark first.';

        return;
    }

    resetInput();

    const version =
        ++uploadVersion;

    $('restoreBookmark').disabled =
        true;

    try {

        /*
         * Get bookmarks from localStorage.
         */

        const bookmarks =
            getBookmarks();

        /*
         * Find selected bookmark.
         */

        const saved =
            bookmarks.find(
                item =>
                    item.id === id
            );

        if (!saved) {

            throw Error(
                'That bookmark could not be found in this browser.'
            );
        }

        if (
            version !== uploadVersion
        ) return;

        /*
         * Restore the saved book.
         */

        load(
            saved.words,
            saved.title
        );

        /*
         * Restore paragraph settings.
         */

        paragraphVersion =
            saved.paragraphVersion || 0;

        /*
         * Restore reading position.
         */

        index =
            Math.max(
                0,
                Math.min(
                    saved.index || 0,
                    words.length - 1
                )
            );

        /*
         * Restore reading speed.
         */

        $('speed').value =
            saved.speed || 250;

        $('speed').oninput();

        /*
         * Restore text area.
         */

        importedWords =
            saved.words;

        importedText =
            plainText(
                saved.words
            );

        $('text').value =
            importedText;

        /*
         * Update the display.
         */

        render();

        $('bookmarkMessage').textContent =
            `Resumed “${saved.title}” at word ${
                index + 1
            }.`;

        /*
         * Explain old bookmarks if necessary.
         */

        if (
            !saved.paragraphVersion
        ) {

            $('bookmarkMessage').textContent +=
                ' This older bookmark has no paragraph information. ' +
                'Re-upload the original document to enable paragraph pauses, ' +
                'then bookmark your spot again.';
        }

    } catch (error) {

        $('bookmarkMessage').textContent =
            error.message ||
            'Could not restore bookmark.';

    } finally {

        $('restoreBookmark').disabled =
            false;
    }
};

/*

============================================================
START APPLICATION
============================================================
*/
load(
sample,
'Sample text'
);

$('message').textContent =
'Try the sample, or add something of your own.';

refreshBookmarks();
return beat * (
    multiplier +
    extra +
    (word.paragraphEnd ? 3 : 0)
);
