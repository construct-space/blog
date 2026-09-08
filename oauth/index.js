/**
 * Construct OAuth Bridge for Ghost
 *
 * Adds OAuth2 routes to Ghost's Express app.
 * Creates Ghost members from Construct accounts.
 * Signs members in via Ghost's transient key (magic link token).
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Config from env
const OAUTH_URL = process.env.OAUTH_URL || 'https://accounts.lisaos.dev';
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'construct_blog';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || '';
const BLOG_URL = process.env.url || 'https://construct.blog';

// Ghost Admin API key (id:secret hex format)
const GHOST_ADMIN_KEY = process.env.GHOST_ADMIN_KEY || '';

// In-memory CSRF states
const pendingStates = new Map();

// Clean expired states every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, exp] of pendingStates) {
    if (now > exp) pendingStates.delete(key);
  }
}, 5 * 60 * 1000);

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate Ghost Admin API JWT
 */
function ghostAdminToken() {
  if (!GHOST_ADMIN_KEY) return null;
  const [id, secret] = GHOST_ADMIN_KEY.split(':');

  const header = Buffer.from(JSON.stringify({
    alg: 'HS256', typ: 'JWT', kid: id
  })).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iat: now, exp: now + 300, aud: '/admin/'
  })).toString('base64url');

  const sig = crypto
    .createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(header + '.' + payload)
    .digest('base64url');

  return header + '.' + payload + '.' + sig;
}

/**
 * Make HTTP(S) request
 */
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, options, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

/**
 * Find or create Ghost member by email
 */
async function findOrCreateMember(email, name) {
  const token = ghostAdminToken();
  if (!token) throw new Error('No Ghost admin key configured');

  // Search for existing member
  const searchUrl = `${BLOG_URL}/ghost/api/admin/members/?filter=email:'${encodeURIComponent(email)}'`;
  const search = await request(searchUrl, {
    headers: { 'Authorization': `Ghost ${token}` }
  });

  if (search.data.members && search.data.members.length > 0) {
    return search.data.members[0];
  }

  // Create new member
  const createUrl = `${BLOG_URL}/ghost/api/admin/members/`;
  const member = await request(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Ghost ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ members: [{ email, name }] })
  });

  if (member.data.members) {
    return member.data.members[0];
  }

  throw new Error('Failed to create member: ' + JSON.stringify(member.data));
}

/**
 * Generate Ghost member sign-in URL using the Admin API
 */
async function getMemberSigninUrl(memberId) {
  const token = ghostAdminToken();
  const url = `${BLOG_URL}/ghost/api/admin/members/${memberId}/signin_urls/`;
  const res = await request(url, {
    headers: { 'Authorization': `Ghost ${token}` }
  });

  if (res.data.member_signin_urls && res.data.member_signin_urls.length > 0) {
    return res.data.member_signin_urls[0].url;
  }

  throw new Error('Failed to get signin URL: ' + JSON.stringify(res.data));
}

/**
 * Exchange OAuth code for access token
 */
async function exchangeCode(code) {
  const redirectUri = BLOG_URL + '/auth/callback';
  const body = JSON.stringify({
    grant_type: 'authorization_code',
    code,
    client_id: OAUTH_CLIENT_ID,
    client_secret: OAUTH_CLIENT_SECRET,
    redirect_uri: redirectUri
  });

  const res = await request(OAUTH_URL + '/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });

  if (res.status !== 200) {
    throw new Error('Token exchange failed: ' + JSON.stringify(res.data));
  }

  return res.data;
}

/**
 * Fetch user info from Construct accounts
 */
async function fetchUserInfo(accessToken) {
  const res = await request(OAUTH_URL + '/api/me', {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });

  if (res.status !== 200) {
    throw new Error('User info failed: ' + JSON.stringify(res.data));
  }

  return res.data;
}

/**
 * Mount OAuth routes on Ghost's Express app
 */
function mount(app) {
  console.log('[oauth] Mounting Construct OAuth routes');

  // GET /auth/login — redirect to Construct OAuth
  app.get('/auth/login', (req, res) => {
    const state = randomHex(32);
    pendingStates.set(state, Date.now() + 10 * 60 * 1000);

    const redirectUri = BLOG_URL + '/auth/callback';
    const params = new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'profile email',
      state
    });

    res.redirect(OAUTH_URL + '/oauth/authorize?' + params.toString());
  });

  // GET /auth/callback — handle OAuth callback
  app.get('/auth/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(BLOG_URL + '/?auth_error=' + encodeURIComponent(error));
      }

      if (!code || !state) {
        return res.redirect(BLOG_URL + '/?auth_error=missing_params');
      }

      // Validate state
      if (!pendingStates.has(state) || Date.now() > pendingStates.get(state)) {
        pendingStates.delete(state);
        return res.redirect(BLOG_URL + '/?auth_error=invalid_state');
      }
      pendingStates.delete(state);

      // Exchange code for token
      const tokenData = await exchangeCode(code);
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        return res.redirect(BLOG_URL + '/?auth_error=no_token');
      }

      // Fetch user info from Construct
      const user = await fetchUserInfo(accessToken);
      const email = user.email;
      let name = user.name || '';
      if (!name) {
        name = [user.first_name, user.last_name].filter(Boolean).join(' ');
      }
      if (!name) {
        name = user.username || '';
      }

      if (!email) {
        return res.redirect(BLOG_URL + '/?auth_error=no_email');
      }

      // Find or create Ghost member
      const member = await findOrCreateMember(email, name);

      // Get Ghost member sign-in URL (sets member cookie)
      const signinUrl = await getMemberSigninUrl(member.id);

      // Redirect to Ghost's sign-in URL which will authenticate the member
      // and redirect back to the blog
      res.redirect(signinUrl);
    } catch (err) {
      console.error('[oauth] Callback error:', err.message);
      res.redirect(BLOG_URL + '/?auth_error=server_error');
    }
  });

  console.log('[oauth] Routes mounted: /auth/login, /auth/callback');
}

module.exports = { mount };
