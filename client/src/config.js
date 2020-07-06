require('dotenv').config();

export default {
  oidc: {
    clientId: process.env.REACT_APP_OKTA_CLIENT_ID,
    issuer: `${process.env.REACT_APP_OKTA_ORG_URL}/oauth2/default`,
    redirectUri: `${window.location.origin}/implicit/callback`,
    scopes: ['openid', 'profile', 'email'],
    pkce: false,
    disableHttpsCheck: true,
    idps: [
      {type: 'Facebook', id: process.env.REACT_APP_IDP_ID_FB}
      ],
    idpDisplay: "PRIMARY",
  },
  resourceServer: {
    messagesUrl: `${window.location.origin}/api/messages`,
  },
};