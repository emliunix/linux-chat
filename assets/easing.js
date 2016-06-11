/* coding: utf-8 */

function *easing(_from, to) {
    var delta = Math.abs(to - _from);
    var op = _from > to ? (acc, val) => acc - val : (acc, val) => acc + val;

    for(var x = 0.01; x <= 1; x += 0.01) {
        var v = easeInOutQuad(x);
        yield op(_from, delta * v)
    }
}

function easeInOutQuad(t) {
    return t<.5 ? 2*t*t : -1+(4-2*t)*t;
}