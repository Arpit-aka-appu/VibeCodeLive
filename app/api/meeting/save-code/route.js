import mongoose from "mongoose";
import Meeting from "@/models/Meeting.js";
import { connectDB } from "@/lib/db.js";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await connectDB();
    const { meetingId, code, output } = await req.json();

    if (!meetingId) {
      return NextResponse.json(
        { success: false, message: "meetingId is required" },
        { status: 400 }
      );
    }

    const filter = mongoose.isValidObjectId(meetingId)
      ? { _id: meetingId }
      : { url: meetingId };

    const updateFields = {};
    if (typeof code === "string") updateFields["data.code"] = code;
    if (Array.isArray(output)) updateFields["data.output"] = output;

    await Meeting.updateOne(filter, { $set: updateFields });

    return NextResponse.json({
      success: true,
      message: "Code saved successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
