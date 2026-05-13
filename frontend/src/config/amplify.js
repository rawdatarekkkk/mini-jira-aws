import { Amplify } from "aws-amplify";

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const region = import.meta.env.VITE_AWS_REGION || "eu-north-1";

export function isAuthConfigured() {
  return Boolean(
    userPoolId &&
      userPoolClientId &&
      userPoolId !== "PUT_LATER" &&
      userPoolClientId !== "PUT_LATER"
  );
}

export function configureAmplify() {
  if (!isAuthConfigured()) {
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  });
}

export { region };
