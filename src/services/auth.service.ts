import bcrypt from "bcryptjs";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";

export const registerUser = async (input: RegisterInput) => {
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "USER_ALREADY_EXISTS",
        "A user with this email already exists.",
      );
    }

    throw error;
  }
};

export const authenticateUser = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email.toLowerCase(),
    },
  });

  if (!user) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
    );
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
    );
  }

  return user;
};

export const getUserById = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(
      404,
      "USER_NOT_FOUND",
      "User was not found.",
    );
  }

  return user;
};