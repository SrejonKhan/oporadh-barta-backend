import { z } from "zod";
import {
  refreshAccessTokenSchema,
  signInSchema,
  signUpSchema,
  changePasswordSchema,
  redeemChangePasswordSchema,
  googleOAuth2SignInSchema,
  verifyOtpSchema,
  banUserSchema,
} from "../../src/schemas/auth.schema";
import { bearerAuth, registry } from "./generator";

registry.registerPath({
  method: "post",
  path: "/auth/signin",
  summary: "Email-Pass SignIn",
  description: "Email-Pass SignIn, successfull respond with user data and token data.",
  security: [],
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": { schema: signInSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Object with user data and token data.",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/signup",
  summary: "Email-Pass SignUp",
  description: "Email-Pass SignUp, successfull respond with user data and token data to authenticate on the go.",
  security: [],
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": { schema: signUpSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Object with user data and token data.",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/whoami",
  summary: "Identify currently signed in user",
  description: "Identify using token from header.",
  security: [{ [bearerAuth.name]: [] }],
  tags: ["Authentication"],
  request: {},
  responses: {
    200: {
      description: "Object with user data and token data.",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/forget-password",
  summary: "Forget Password",
  description: "Forget Password endpoint, successfull respond with masked user email.",
  security: [],
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            username: z.string().min(3),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Object with masked email.",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  summary: "Get a new Access Token exchanging a valid Refresh Token.",
  description: `A valid Refresh Token must be provided. 
    If user's critical info is changed after the provided Refresh Token is issued,
    the Refresh Token will be taken as invalidated, so Reauthentication is required.`,
  security: [],
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": { schema: refreshAccessTokenSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Object with a message and new access token.",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/change-password",
  summary: "Request a password reset",
  description: `A 6-digit reset code will be sent via SMS to the user's registered phone number. Includes rate limiting to prevent spam.`,
  security: [],
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email().describe("User's email address"),
            username: z.string().min(3).describe("User's username"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Success response with masked phone number",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string().describe("Success message"),
            maskedPhone: z.string().describe("Masked phone number (e.g. 88******75)"),
          }),
        },
      },
    },
    400: {
      description: "Error responses",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string().describe("Error message"),
          }).describe("Possible errors: User not found, No phone number, Recent request exists"),
        },
      },
    },
    500: {
      description: "SMS sending failed",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string().describe("SMS sending failed message"),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/redeem-change-password",
  summary: "Reset password using SMS code",
  description: `Reset user password using the 6-digit code received via SMS and the new password. Code expires after 15 minutes.`,
  security: [],
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            token: z.string().length(6).describe("6-digit SMS code received"),
            password: z.string().min(8).describe("New password"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password successfully changed",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string().describe("Success message"),
          }),
        },
      },
    },
    400: {
      description: "Error response",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string().describe("Error message"),
          }).describe("Possible errors: Invalid code, Expired code"),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/google-signin",
  summary: "Google OAuth2 SignIn.",
  description: `Sign in with Google OAuth2 Code.`,
  security: [],
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": { schema: googleOAuth2SignInSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Object with the user profile.",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/verify-otp",
  summary: "Verify OTP.",
  description: `Verify OTP for the user.`,
  security: [{ [bearerAuth.name]: [] }],
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": { schema: verifyOtpSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Object with a message.",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/send-new-otp",
  summary: "Send new OTP.",
  description: `Send new OTP for the user.`,
  security: [{ [bearerAuth.name]: [] }],
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": { schema: z.object({}) },
      },
    },
  },
  responses: {
    200: {
      description: "Object with a message.",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/ban-user",
  summary: "Ban User.",
  description: `Ban user by email.`,
  security: [{ [bearerAuth.name]: [] }],
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: banUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Object with a message.",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/check-phone",
  summary: "Check user's phone number",
  description: `Check if user has a registered phone number before initiating password reset. Returns masked phone number if exists.`,
  security: [],
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email().describe("User's email address"),
            username: z.string().min(3).describe("User's username"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Phone number check response",
      content: {
        "application/json": {
          schema: z.object({
            hasPhone: z.boolean().describe("Whether user has a registered phone"),
            maskedPhone: z.string().optional().describe("Masked phone number if exists (e.g. 88******75)"),
            message: z.string().describe("Response message"),
          }),
        },
      },
    },
    400: {
      description: "Error response",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string().describe("Error message"),
          }).describe("Possible error: User not found"),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/users",
  summary: "Get all users",
  description: "Retrieve paginated list of all users. Admin access only.",
  security: [{ [bearerAuth.name]: [] }],
  tags: ["Authentication"],
  request: {
    params: z.object({
      page: z.string().optional().describe("Page number (default: 1)"),
      limit: z.string().optional().describe("Items per page (default: 10)"),
    }),
  },
  responses: {
    200: {
      description: "List of users with pagination metadata",
      content: {
        "application/json": {
          schema: z.object({
            users: z.array(z.object({
              id: z.string(),
              email: z.string(),
              username: z.string(),
              displayName: z.string(),
              phoneNumber: z.string(),
              role: z.enum(["USER", "ADMIN"]),
              isVerified: z.boolean(),
              isAdminBan: z.boolean(),
              banReason: z.string().nullable(),
              createdAt: z.string(),
              updatedAt: z.string(),
            })),
            metadata: z.object({
              total: z.number().describe("Total number of users"),
              page: z.number().describe("Current page"),
              limit: z.number().describe("Items per page"),
              totalPages: z.number().describe("Total number of pages"),
            }),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid or missing token",
    },
    403: {
      description: "Forbidden - User is not an admin",
    },
  },
});
