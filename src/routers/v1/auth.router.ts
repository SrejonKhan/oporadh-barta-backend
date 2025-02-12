import express from "express";
import {
  changePassword,
  googleOAuth2SignIn,
  redeemChangePassword,
  refreshAccessToken,
  sendNewOtp,
  signIn,
  signUp,
  verifyOtp,
  whoami,
} from "../../controllers/auth.controller";
import { hasRole, requireAuth } from "../../middlewares/auth.middleware";
import { Role } from "@prisma/client";
import { auth } from "googleapis/build/src/apis/abusiveexperiencereport";

const authRouter = express.Router();

authRouter.post("/signin", signIn);
authRouter.post("/signup", signUp);
authRouter.get("/whoami", hasRole(["*"]), whoami);
authRouter.post("/change-password", changePassword);
authRouter.post("/redeem-change-password", redeemChangePassword);
authRouter.post("/refresh", refreshAccessToken);
authRouter.post("/google-signin", googleOAuth2SignIn);
authRouter.post("/verify-otp", hasRole(["*"]), verifyOtp);
authRouter.post("/send-new-otp", hasRole(["*"]), sendNewOtp);

export default authRouter;
