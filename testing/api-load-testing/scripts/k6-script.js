import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    public_login: {
      executor: 'constant-vus',
      vus: 20,
      duration: '45s',
      exec: 'testLogin'
    },
    public_home: {
      executor: 'constant-vus',
      vus: 20,
      duration: '45s',
      exec: 'testHome'
    },
    api_user_profile: {
      executor: 'constant-vus',
      vus: 20,
      duration: '45s',
      exec: 'testUserProfile'
    },
    api_chat_conversations: {
      executor: 'constant-vus',
      vus: 20,
      duration: '45s',
      exec: 'testChatConversations'
    },
    api_user_keys: {
      executor: 'constant-vus',
      vus: 20,
      duration: '45s',
      exec: 'testUserKeys'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000']
  }
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

// Scenario 1: Public /login page response (Historical Baseline)
export function testLogin() {
  const res = http.get(`${BASE_URL}/login`, {
    tags: { endpoint: 'login', scenario: 'public_login' }
  });
  check(res, {
    'login status is 200': (r) => r.status === 200,
    'login has content': (r) => r.body && r.body.length > 500
  });
  sleep(0.3);
}

// Scenario 2: Public landing page response
export function testHome() {
  const res = http.get(`${BASE_URL}/`, {
    tags: { endpoint: 'home', scenario: 'public_home' }
  });
  check(res, {
    'home status is 200': (r) => r.status === 200,
    'home has content': (r) => r.body && r.body.length > 500
  });
  sleep(0.3);
}

// Scenario 3: Safe read-only API endpoint: User Profile (auth validation gate)
export function testUserProfile() {
  const res = http.get(`${BASE_URL}/api/user/profile`, {
    headers: { 'Accept': 'application/json' },
    tags: { endpoint: 'api_user_profile', scenario: 'api_user_profile' }
  });
  check(res, {
    'user profile returns valid auth gate (401 or 200)': (r) => r.status === 401 || r.status === 200
  });
  sleep(0.3);
}

// Scenario 4: Safe read-only API endpoint: Chat Conversations listing
export function testChatConversations() {
  const res = http.get(`${BASE_URL}/api/chat/conversations`, {
    headers: { 'Accept': 'application/json' },
    tags: { endpoint: 'api_chat_conversations', scenario: 'api_chat_conversations' }
  });
  check(res, {
    'chat conversations returns valid auth gate (401 or 200)': (r) => r.status === 401 || r.status === 200
  });
  sleep(0.3);
}

// Scenario 5: Safe read-only API endpoint: API Provider Keys listing
export function testUserKeys() {
  const res = http.get(`${BASE_URL}/api/user/keys`, {
    headers: { 'Accept': 'application/json' },
    tags: { endpoint: 'api_user_keys', scenario: 'api_user_keys' }
  });
  check(res, {
    'user keys returns valid auth gate (401 or 200)': (r) => r.status === 401 || r.status === 200
  });
  sleep(0.3);
}

export default function () {
  testLogin();
}
