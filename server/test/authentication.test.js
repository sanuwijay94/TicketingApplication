// Tests for the token guard in ../authentication.js.
//
// The server has no test runner (adding one needs a new dependency, which is Ask First), so this is
// a plain Node script that uses only `assert` and the committed jsonwebtoken. Run it with:
//   cd server && node test/authentication.test.js
// It prints one line per case and exits with code 1 if any case fails.
const assert = require('assert');
const jwt = require('jsonwebtoken');
const authentication = require('../authentication');

const SECRET = 'secret'; // the literal middleware/login.js signs with and authentication.js verifies with

// --- factories -----------------------------------------------------------------------------

// A signed token shaped like the one middleware/login.js issues: { username, type }.
function tokenFor(type, signOptions) {
    return jwt.sign({ username: 'someone', type: type }, SECRET, signOptions || { expiresIn: '50m' });
}

function changeMiddleCharacter(text) {
    const middle = Math.floor(text.length / 2);
    return text.slice(0, middle) + (text[middle] === 'A' ? 'B' : 'A') + text.slice(middle + 1);
}

function base64Url(text) {
    return Buffer.from(text).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// --- helper: run the guard against a fake request ------------------------------------------

// `token` is the x-access-token header value; pass undefined to send no header at all.
function callGuard(isSupervisor, token) {
    const outcome = { nextCalled: false, status: null, body: null, decoded: undefined };
    const req = { headers: token === undefined ? {} : { 'x-access-token': token } };
    const res = {
        status: function (code) { outcome.status = code; return res; },
        json: function (body) { outcome.body = body; return res; }
    };
    const realLog = console.log;
    console.log = function () {}; // the guard logs on every call; keep this script's output readable
    try {
        authentication.authorization(isSupervisor)(req, res, function () { outcome.nextCalled = true; });
    } finally {
        console.log = realLog;
    }
    outcome.decoded = req.decoded;
    return outcome;
}

function assertRejected(outcome, expectedMessage) {
    assert.strictEqual(outcome.nextCalled, false, 'the request must not reach the handler');
    assert.strictEqual(outcome.status, 403);
    assert.strictEqual(outcome.body.success, false);
    assert.strictEqual(outcome.body.message, expectedMessage);
}

// --- cases ---------------------------------------------------------------------------------

const cases = [];
function test(name, body) { cases.push({ name: name, body: body }); }

test('accepts a valid Agent token on a route open to every role', function () {
    const outcome = callGuard(false, tokenFor('Agent'));
    assert.strictEqual(outcome.nextCalled, true);
    assert.strictEqual(outcome.decoded.type, 'Agent');
});

test('accepts a valid Supervisor token on a Supervisor-only route', function () {
    const outcome = callGuard(true, tokenFor('Supervisor'));
    assert.strictEqual(outcome.nextCalled, true);
    assert.strictEqual(outcome.decoded.type, 'Supervisor');
});

test('rejects an Agent token on a Supervisor-only route with 403', function () {
    assertRejected(callGuard(true, tokenFor('Agent')), 'Unauthorised User');
});

test('rejects a request with no token with 403', function () {
    assertRejected(callGuard(false, undefined), 'Unauthorised');
});

test('rejects an expired token with 403', function () {
    assertRejected(callGuard(false, tokenFor('Agent', { expiresIn: -10 })), 'Unauthorised User');
});

test('rejects a token signed with another secret with 403', function () {
    const foreign = jwt.sign({ username: 'someone', type: 'Supervisor' }, 'another secret', { expiresIn: '50m' });
    assertRejected(callGuard(true, foreign), 'Unauthorised User');
});

test('rejects a token whose signature was altered with 403', function () {
    const parts = tokenFor('Agent').split('.');
    parts[2] = changeMiddleCharacter(parts[2]);
    assertRejected(callGuard(false, parts.join('.')), 'Unauthorised User');
});

// The cases below are tokens the server cannot even decode. They used to crash the guard (a null
// from jwt.decode, or a SyntaxError for a payload that is not JSON), which became a 500.

test('rejects text that is not a JWT with 403, not a server error', function () {
    assertRejected(callGuard(false, 'hello'), 'Unauthorised User');
});

test('rejects a token whose header was altered with 403, not a server error', function () {
    const parts = tokenFor('Agent').split('.');
    parts[0] = changeMiddleCharacter(parts[0]);
    assertRejected(callGuard(false, parts.join('.')), 'Unauthorised User');
});

test('rejects a token whose payload is not JSON with 403, not a server error', function () {
    const parts = tokenFor('Agent').split('.');
    parts[1] = base64Url('this is not json');
    assertRejected(callGuard(false, parts.join('.')), 'Unauthorised User');
});

test('rejects a token with its signature part removed with 403, not a server error', function () {
    const parts = tokenFor('Agent').split('.');
    assertRejected(callGuard(false, parts[0] + '.' + parts[1]), 'Unauthorised User');
});

// --- runner --------------------------------------------------------------------------------

let failed = 0;
cases.forEach(function (c) {
    try {
        c.body();
        process.stdout.write('ok   - ' + c.name + '\n');
    } catch (error) {
        failed += 1;
        process.stdout.write('FAIL - ' + c.name + '\n       ' + error.name + ': ' + error.message + '\n');
    }
});
process.stdout.write('\n' + (cases.length - failed) + ' passed, ' + failed + ' failed (' + cases.length + ' cases)\n');
process.exitCode = failed > 0 ? 1 : 0;
