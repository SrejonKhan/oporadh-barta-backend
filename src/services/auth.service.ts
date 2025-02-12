import prisma from "../lib/prisma";
import bcrypt from "bcrypt";
import { ApiError } from "../utils/error";
import config from "../config/base.config";
import jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import { excludeFromObject } from "../utils/object";
import { generateUserNameFromEmail, maskEmailAddress } from "../utils/string";
import httpStatus from "http-status";
import { sendToExchange } from "../lib/amqp";
import { randomBytes } from "crypto";
import logger from "../utils/logger";
import axios from "axios";
import { oauth2Client } from "../lib/google";
import { TokenPayload, TokenType } from "../interfaces/auth.interface";

const handleUserSignIn = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    throw new ApiError(401, "User not found!");
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, "Invalid Password!");
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user: excludeFromObject(user, ["passwordHash"]),
    token: {
      accessToken,
      refreshToken,
    },
  };
};

const handleUserSignUp = async (
  email: string,
  password: string,
  username: string,
  displayName: string,
  phoneNumber: string
) => {
  const userWithEmail = await prisma.user.findUnique({
    where: { email: email },
  });

  if (userWithEmail) {
    throw new ApiError(400, "User with same email already exist!");
  }

  const userWithUsername = await prisma.user.findUnique({
    where: { username: username },
  });

  if (userWithUsername) {
    throw new ApiError(400, "User with same username already exist!");
  }

  const passwordHash = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: email,
      username: username,
      displayName: displayName,
      passwordHash: passwordHash,
      phoneNumber: phoneNumber,
    },
  });

  const secretNumber = Math.floor(100000 + Math.random() * 900000);
  const otpSecret = await prisma.otpSecret.create({
    data: {
      userId: user.id,
      secret: secretNumber.toString(),
    },
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const smsBody = {
    api_key: process.env.SMS_API_KEY,
    type: "text",
    number: phoneNumber,
    senderid: process.env.SMS_SENDER_ID,
    message: `Welcome to our platform, ${displayName}! To verify your phone number, please use the following OTP: ${otpSecret.secret}`,
  };

  try {
    await axios.get("https://bulksmsbd.net/api/smsapi", {
      params: smsBody,
    });
  } catch (error) {
    logger.error(`Error sending SMS to ${phoneNumber}. Error: ${error.message}`);
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      otpSecret: {
        connect: { id: otpSecret.id },
      },
    },
  });

  return {
    user: excludeFromObject(user, ["passwordHash"]),
    token: {
      accessToken,
      refreshToken,
    },
  };
};

const generateAccessToken = (user: User) => {
  const payload: TokenPayload = {
    type: TokenType.refreshToken,
    jwtUser: excludeFromObject(user, ["passwordHash"]),
  };
  return jwt.sign(payload, config.RSA_PRIVATE_KEY, { algorithm: "RS256", expiresIn: 60 * 60 });
};

const generateRefreshToken = (user: User) => {
  const payload: TokenPayload = {
    type: TokenType.refreshToken,
    jwtUser: excludeFromObject(user, ["passwordHash"]),
  };
  return jwt.sign(payload, config.RSA_PRIVATE_KEY, { algorithm: "RS256", expiresIn: 60 * 60 });
};

const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email: email },
  });
};

const findUserByUsername = async (username: string) => {
  return await prisma.user.findUnique({
    where: { username: username },
  });
};

const handleChangePassword = async (email: string, username: string, ipAddress: string) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: email }, { username: username }] },
  });

  if (!user) {
    throw new ApiError(400, "User doesn't exist with the provided email/username!");
  }

  if (!user.phoneNumber) {
    throw new ApiError(400, "User doesn't have a registered phone number!");
  }

  // Check for existing recent requests
  const tokens = await prisma.changePasswordRequest.findMany({
    where: {
      AND: [{ userId: user.id }],
    },
  });

  const currentTime = new Date().getTime();
  const FIFTEEN_MINS = 15 * 60 * 1000;
  for (const token of tokens) {
    if (currentTime - token.requestedAt.getTime() < FIFTEEN_MINS) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "A change password request was made recently. Please wait before requesting again."
      );
    }
  }

  // Generate 6-digit token
  const changePassToken = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.changePasswordRequest.create({
    data: {
      reqIpAddress: ipAddress,
      token: changePassToken,
      userId: user.id,
    },
  });

  // Send SMS with token
  const smsBody = {
    api_key: process.env.SMS_API_KEY,
    type: "text",
    number: user.phoneNumber,
    senderid: process.env.SMS_SENDER_ID,
    message: `Your password reset code is: ${changePassToken}. This code will expire in 15 minutes.`,
  };

  try {
    await axios.get("https://bulksmsbd.net/api/smsapi", {
      params: smsBody,
    });
  } catch (error) {
    logger.error(`Error sending SMS to ${user.phoneNumber}. Error: ${error.message}`);
    throw new ApiError(500, "Failed to send reset code via SMS");
  }

  return { maskedPhone: user.phoneNumber.replace(/(\d{2})(\d{6})(\d{2})/, "$1******$3") };
};

const handleRedeemChangePassword = async (token: string, password: string, ipAddress: string) => {
  const changePassReq = await prisma.changePasswordRequest.findUnique({
    where: { token: token },
    include: {
      user: true,
    },
  });

  if (!changePassReq) {
    throw new ApiError(400, "No Change Password Request exist with the following token!");
  }

  const passwordHash = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);

  // update
  await prisma.user.update({
    where: {
      email: changePassReq.user.email,
    },
    data: {
      passwordHash: passwordHash,
    },
  });

  await prisma.changePasswordRequest.delete({
    where: {
      token: token,
    },
  });

  const exchangeContent = {
    email: changePassReq.user.email,
    redeemTime: Date.now(),
    redeemIpAddress: ipAddress,
  };

  // send a confirmation mail to the user
  sendToExchange("exchange.mail", "change_pass_confirmation", exchangeContent);

  return { maskedEmail: maskEmailAddress(changePassReq.user.email) };
};

const exchangeAccessToken = async (grantType: string, refreshToken: string): Promise<string> => {
  const payload = jwt.verify(refreshToken, config.RSA_PUBLIC_KEY, { algorithms: ["RS256"] });
  const { type, jwtUser }: TokenPayload = JSON.parse(JSON.stringify(payload));

  if (type == TokenType.accessToken)
    throw new ApiError(httpStatus.BAD_REQUEST, "Expected Refresh Token but received Access Token");

  const user = await prisma.user.findUnique({
    where: { email: jwtUser.email },
  });

  if (!user) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "User's critical info is updated since the refresh token is issued. Please re-authenticate."
    );
  }

  const accessToken = generateAccessToken(user);
  return accessToken;
};

const handleGoogleSignIn = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);

  const userResponse = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  const googleUserData: {
    email: string;
    email_verified: boolean;
    family_name: string;
    given_name: string;
    name: string;
    picture: string;
    sub: string;
  } = userResponse.data;

  let user = await prisma.user.findUnique({
    where: { email: googleUserData.email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: googleUserData.email,
        username: generateUserNameFromEmail(googleUserData.email),
        displayName: googleUserData.name,
        passwordHash: "",
        authType: "OAUTH",
        phoneNumber: "",
      },
    });
    logger.info(`New user created using Google OAuth. UserID: ${user.id}.`);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user: excludeFromObject(user, ["passwordHash"]),
    token: {
      accessToken,
      refreshToken,
    },
  };
};

const handleVerifyOTP = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email },
    include: {
      otpSecret: true,
    },
  });

  if (!user) {
    throw new ApiError(400, "User not found with the provided email!");
  }

  // check otp with the latest created otp

  if (user.otpSecret.length === 0) {
    throw new ApiError(400, "No OTP found for the user!");
  }

  // get the latest otp
  const latestOtp = user.otpSecret[user.otpSecret.length - 1].secret;
  console.log(latestOtp, otp);
  if (latestOtp !== otp) {
    throw new ApiError(400, "Invalid OTP!");
  }

  // check the time if it exceeds 5 mins
  const currentTime = new Date().getTime();
  const FIVE_MINS = 5 * 60 * 1000; /* ms */
  if (currentTime - user.otpSecret[user.otpSecret.length - 1].createdAt.getTime() > FIVE_MINS) {
    throw new ApiError(400, "OTP expired. Please request a new one.");
  }

  await prisma.otpSecret.delete({
    where: {
      id: user.otpSecret[0].id,
    },
  });

  // update user to verified
  const updatedUser = await prisma.user.update({
    where: {
      email: email,
    },
    data: {
      isVerified: true,
    },
  });

  return { message: "Phone number verified successfully!", user: excludeFromObject(updatedUser, ["passwordHash"]) };
};

const handleSendNewOTP = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    throw new ApiError(400, "User not found with the provided email!");
  }

  const secretNumber = Math.floor(100000 + Math.random() * 900000);
  const otpSecret = await prisma.otpSecret.create({
    data: {
      userId: user.id,
      secret: secretNumber.toString(),
    },
  });

  const smsBody = {
    api_key: process.env.SMS_API_KEY,
    type: "text",
    number: user.phoneNumber,
    senderid: process.env.SMS_SENDER_ID,
    message: `Welcome back! To verify your phone number, please use the following OTP: ${otpSecret.secret}`,
  };

  try {
    await axios.get("https://bulksmsbd.net/api/smsapi", {
      params: smsBody,
    });
  } catch (error) {
    logger.error(`Error sending SMS to ${user.phoneNumber}. Error: ${error.message}`);
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      otpSecret: {
        connect: { id: otpSecret.id },
      },
    },
  });

  return { message: "New OTP sent successfully!" };
};

const handleBanUser = async (email: string, banReason: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    throw new ApiError(400, "User not found with the provided wmail!");
  }

  await prisma.user.update({
    where: {
      email: email,
    },
    data: {
      isAdminBan: true,
      banReason: banReason,
    },
  });

  return { message: "User is banned successfully!" };
};

const checkPhoneNumber = async (email: string, username: string) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: email }, { username: username }] },
  });

  if (!user) {
    throw new ApiError(400, "User doesn't exist with the provided email/username!");
  }

  if (!user.phoneNumber) {
    return { 
      hasPhone: false,
      message: "User does not have a registered phone number. Please contact support." 
    };
  }

  return { 
    hasPhone: true,
    maskedPhone: user.phoneNumber.replace(/(\d{2})(\d{6})(\d{2})/, "$1******$3"),
    message: "Phone number found! Proceed with password reset." 
  };
};

const getAllUsers = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        phoneNumber: true,
        role: true,
        isVerified: true,
        isAdminBan: true,
        banReason: true,
        createdAt: true,
        updatedAt: true,
      }
    }),
    prisma.user.count()
  ]);

  return {
    users,
    metadata: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export {
  handleUserSignIn,
  handleUserSignUp,
  findUserByEmail,
  findUserByUsername,
  handleChangePassword,
  handleRedeemChangePassword,
  exchangeAccessToken,
  handleGoogleSignIn,
  handleVerifyOTP,
  handleSendNewOTP,
  handleBanUser,
  checkPhoneNumber,
  getAllUsers,
};
