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
