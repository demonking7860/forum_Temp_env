// src/utils/authUtils.js
import awsmobile from "../awsConfig";

export const signInWithGoogle = () => {
  const { domain, redirectSignIn, responseType, scope } = awsmobile.oauth;
  const clientId = awsmobile.aws_user_pools_web_client_id;

  const loginUrl = `https://${domain}/oauth2/authorize?identity_provider=Google&redirect_uri=${encodeURIComponent(
    redirectSignIn
  )}&response_type=${responseType}&client_id=${clientId}&scope=${encodeURIComponent(
    scope.join(" ")
  )}&prompt=select_account`;

  window.location.href = loginUrl;
};
