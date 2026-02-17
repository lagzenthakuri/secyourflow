import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireSessionWithOrg(request);
        if (!authResult.ok) return authResult.response;

        const user = await prisma.user.findUnique({
            where: { id: authResult.context.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Profile GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const authResult = await requireSessionWithOrg(request);
        if (!authResult.ok) return authResult.response;

        const { name } = await request.json();

        if (typeof name !== "string" || name.trim().length === 0) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: authResult.context.userId },
            data: { name: name.trim() },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Profile PATCH Error:", error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
